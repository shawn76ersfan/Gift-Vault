import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import { addDays, fromUtcMs, isLeapYear, SEND_HOUR_UTC, toUtcMs } from './lib/dates';
import { authedMutation, authedQuery } from './lib/customFunctions';
import { giftDoc, recipientDoc, userDoc } from './lib/validators';
import { MAX_GIFT_CENTS, MIN_GIFT_CENTS } from './occasions';
import { getOwnedRecipient } from './recipients';
import { addLedgerEntry } from './vault';

const SCAN_DAYS = 14;

const OCCASION_LABELS: Record<Doc<'occasions'>['type'], string> = {
  birthday: 'birthday',
  anniversary: 'anniversary',
  holiday: 'holiday',
  custom: 'special day',
};

async function notify(ctx: MutationCtx, userId: Id<'users'>, title: string, body: string) {
  await ctx.scheduler.runAfter(0, internal.notifications.sendToUser, { userId, title, body });
}

async function failGift(ctx: MutationCtx, gift: Doc<'gifts'>, reason: string) {
  await ctx.db.patch('gifts', gift._id, { status: 'failed', failureReason: reason });
  const recipient = await ctx.db.get('recipients', gift.recipientId);
  await notify(ctx, gift.userId, 'Gift could not be sent', `${recipient?.name ?? 'Your gift'}: ${reason}`);
}

const giftWithRecipient = v.object({ gift: giftDoc, recipientName: v.string() });

export const list = authedQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(giftWithRecipient),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('gifts')
      .withIndex('by_user_and_sendDate', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (gift) => {
        const recipient = await ctx.db.get('recipients', gift.recipientId);
        return { gift, recipientName: recipient?.name ?? 'Removed contact' };
      }),
    );
    return { ...result, page };
  },
});

export const get = authedQuery({
  args: { giftId: v.id('gifts') },
  returns: v.union(giftDoc, v.null()),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift || gift.userId !== ctx.user._id) return null;
    return gift;
  },
});

export const sendNow = authedMutation({
  args: {
    recipientId: v.id('recipients'),
    amountCents: v.number(),
    message: v.optional(v.string()),
    occasionId: v.optional(v.id('occasions')),
  },
  returns: v.id('gifts'),
  handler: async (ctx, args) => {
    const recipient = await getOwnedRecipient(ctx, ctx.user._id, args.recipientId);
    if (!recipient.email) throw new ConvexError(`Add an email for ${recipient.name} so we know where to send the gift`);
    if (!Number.isInteger(args.amountCents) || args.amountCents < MIN_GIFT_CENTS || args.amountCents > MAX_GIFT_CENTS) {
      throw new ConvexError('Gift amount must be between $5 and $500');
    }
    if (!ctx.user.defaultPaymentMethodId) throw new ConvexError('Add a card in Settings before sending gifts');
    if ((ctx.user.vaultBalanceCents ?? 0) < args.amountCents) {
      throw new ConvexError('Your vault budget is too low for this gift. Add funds on the Vault tab.');
    }
    if (args.occasionId) {
      const occasion = await ctx.db.get('occasions', args.occasionId);
      if (!occasion || occasion.userId !== ctx.user._id) throw new ConvexError('Occasion not found');
    }

    const giftId = await ctx.db.insert('gifts', {
      userId: ctx.user._id,
      recipientId: recipient._id,
      occasionId: args.occasionId,
      amountCents: args.amountCents,
      status: 'scheduled',
      sendDate: Date.now(),
      message: args.message?.trim().slice(0, 280) || undefined,
    });
    await ctx.scheduler.runAfter(0, internal.stripe.chargeGift, { giftId });
    return giftId;
  },
});

export const cancel = authedMutation({
  args: { giftId: v.id('gifts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift || gift.userId !== ctx.user._id) throw new ConvexError('Gift not found');
    if (gift.status !== 'scheduled') throw new ConvexError('This gift is already being processed and can no longer be canceled');
    await ctx.db.patch('gifts', gift._id, { status: 'canceled' });
    return null;
  },
});

export const scheduleUpcoming = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const today = fromUtcMs(now);
    let scheduled = 0;

    for (let offset = 0; offset <= SCAN_DAYS; offset++) {
      const date = addDays(today, offset);
      const monthDays: [number, number][] = [[date.month, date.day]];
      if (date.month === 2 && date.day === 28 && !isLeapYear(date.year)) monthDays.push([2, 29]);

      for (const [month, day] of monthDays) {
        const occasions = await ctx.db
          .query('occasions')
          .withIndex('by_month_day', (q) => q.eq('month', month).eq('day', day))
          .collect();

        for (const occasion of occasions) {
          if (!occasion.autoSend || occasion.leadDays < offset || occasion.lastScheduledYear === date.year) continue;
          const recipient = await ctx.db.get('recipients', occasion.recipientId);
          if (!recipient) continue;

          const sendDate = Math.max(now, toUtcMs(date, SEND_HOUR_UTC));
          const giftId = await ctx.db.insert('gifts', {
            userId: occasion.userId,
            recipientId: occasion.recipientId,
            occasionId: occasion._id,
            amountCents: occasion.amountCents,
            status: 'scheduled',
            sendDate,
          });
          await ctx.db.patch('occasions', occasion._id, { lastScheduledYear: date.year });
          await ctx.scheduler.runAt(sendDate, internal.stripe.chargeGift, { giftId });

          const label = occasion.label ?? OCCASION_LABELS[occasion.type];
          const when = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : `in ${offset} days`;
          await notify(
            ctx,
            occasion.userId,
            'Gift scheduled',
            `${recipient.name}'s ${label} is ${when}. A $${(occasion.amountCents / 100).toFixed(0)} gift card will be sent automatically.`,
          );
          scheduled++;
        }
      }
    }
    return scheduled;
  },
});

export const beginCharge = internalMutation({
  args: { giftId: v.id('gifts') },
  returns: v.union(
    v.null(),
    v.object({ customerId: v.string(), paymentMethodId: v.string(), amountCents: v.number(), recipientName: v.string() }),
  ),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift || gift.status !== 'scheduled') return null;

    const user = await ctx.db.get('users', gift.userId);
    const recipient = await ctx.db.get('recipients', gift.recipientId);
    if (!user || !recipient) {
      await ctx.db.patch('gifts', gift._id, { status: 'canceled' });
      return null;
    }
    if (!recipient.email) {
      await failGift(ctx, gift, `Add an email address for ${recipient.name}`);
      return null;
    }
    if (!user.stripeCustomerId || !user.defaultPaymentMethodId) {
      await failGift(ctx, gift, 'No card on file. Add one in Settings.');
      return null;
    }
    if ((user.vaultBalanceCents ?? 0) < gift.amountCents) {
      await failGift(ctx, gift, 'Vault budget too low. Add funds to keep auto-gifts flowing.');
      return null;
    }

    await ctx.db.patch('gifts', gift._id, { status: 'charging' });
    return {
      customerId: user.stripeCustomerId,
      paymentMethodId: user.defaultPaymentMethodId,
      amountCents: gift.amountCents,
      recipientName: recipient.name,
    };
  },
});

export const attachPaymentIntent = internalMutation({
  args: { giftId: v.id('gifts'), paymentIntentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('gifts', args.giftId, { stripePaymentIntentId: args.paymentIntentId });
    return null;
  },
});

export const markCharged = internalMutation({
  args: { giftId: v.optional(v.id('gifts')), paymentIntentId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = args.giftId
      ? await ctx.db.get('gifts', args.giftId)
      : args.paymentIntentId
        ? await ctx.db
            .query('gifts')
            .withIndex('by_paymentIntent', (q) => q.eq('stripePaymentIntentId', args.paymentIntentId))
            .unique()
        : null;
    if (!gift || gift.status !== 'charging') return null;

    await addLedgerEntry(ctx, { userId: gift.userId, type: 'gift_charge', amountCents: gift.amountCents, giftId: gift._id });
    await ctx.db.patch('gifts', gift._id, { status: 'charged' });
    await ctx.scheduler.runAfter(0, internal.tremendous.sendReward, { giftId: gift._id });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { giftId: v.optional(v.id('gifts')), paymentIntentId: v.optional(v.string()), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = args.giftId
      ? await ctx.db.get('gifts', args.giftId)
      : args.paymentIntentId
        ? await ctx.db
            .query('gifts')
            .withIndex('by_paymentIntent', (q) => q.eq('stripePaymentIntentId', args.paymentIntentId))
            .unique()
        : null;
    if (!gift || gift.status === 'sent' || gift.status === 'failed' || gift.status === 'canceled') return null;
    await failGift(ctx, gift, args.reason);
    return null;
  },
});

export const markRefunded = internalMutation({
  args: { giftId: v.id('gifts'), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift || gift.status !== 'charged') return null;
    await addLedgerEntry(ctx, {
      userId: gift.userId,
      type: 'refund',
      amountCents: gift.amountCents,
      giftId: gift._id,
      note: 'Refunded: gift could not be delivered',
    });
    await failGift(ctx, gift, `${args.reason} Your card was refunded.`);
    return null;
  },
});

export const markSent = internalMutation({
  args: { giftId: v.id('gifts'), tremendousOrderId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift || gift.status !== 'charged') return null;
    await ctx.db.patch('gifts', gift._id, { status: 'sent', tremendousOrderId: args.tremendousOrderId });
    const recipient = await ctx.db.get('recipients', gift.recipientId);
    await notify(
      ctx,
      gift.userId,
      'Gift delivered!',
      `${recipient?.name ?? 'Your recipient'} just received a $${(gift.amountCents / 100).toFixed(0)} gift card from you.`,
    );
    return null;
  },
});

export const getForFulfillment = internalQuery({
  args: { giftId: v.id('gifts') },
  returns: v.union(v.null(), v.object({ gift: giftDoc, recipient: recipientDoc, user: userDoc })),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get('gifts', args.giftId);
    if (!gift) return null;
    const recipient = await ctx.db.get('recipients', gift.recipientId);
    const user = await ctx.db.get('users', gift.userId);
    if (!recipient || !user) return null;
    return { gift, recipient, user };
  },
});
