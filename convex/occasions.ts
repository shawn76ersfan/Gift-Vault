import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { daysBetween, isValidMonthDay, nextOccurrence, parseYmd } from './lib/dates';
import { authedMutation, authedQuery } from './lib/customFunctions';
import { occasionDoc } from './lib/validators';
import { getOwnedRecipient } from './recipients';
import { occasionType } from './schema';

const MAX_OCCASIONS = 500;
export const MIN_GIFT_CENTS = 500;
export const MAX_GIFT_CENTS = 50000;
const MAX_LEAD_DAYS = 14;

const editableFields = {
  type: occasionType,
  label: v.optional(v.string()),
  month: v.number(),
  day: v.number(),
  amountCents: v.number(),
  leadDays: v.number(),
  autoSend: v.boolean(),
};

function validate(fields: { month: number; day: number; amountCents: number; leadDays: number; label?: string }) {
  if (!isValidMonthDay(fields.month, fields.day)) throw new ConvexError('Please pick a valid date');
  if (!Number.isInteger(fields.amountCents) || fields.amountCents < MIN_GIFT_CENTS || fields.amountCents > MAX_GIFT_CENTS) {
    throw new ConvexError('Gift amount must be between $5 and $500');
  }
  if (!Number.isInteger(fields.leadDays) || fields.leadDays < 0 || fields.leadDays > MAX_LEAD_DAYS) {
    throw new ConvexError(`Reminder lead time must be 0 to ${MAX_LEAD_DAYS} days`);
  }
  if (fields.label && fields.label.length > 60) throw new ConvexError('Label must be under 60 characters');
}

async function getOwnedOccasion(ctx: Pick<QueryCtx, 'db'>, userId: Doc<'users'>['_id'], occasionId: Doc<'occasions'>['_id']) {
  const occasion = await ctx.db.get('occasions', occasionId);
  if (!occasion || occasion.userId !== userId) throw new ConvexError('Occasion not found');
  return occasion;
}

const upcomingItem = v.object({
  occasion: occasionDoc,
  recipientName: v.string(),
  nextDate: v.string(),
  daysUntil: v.number(),
});

export const upcoming = authedQuery({
  args: { today: v.string(), limit: v.optional(v.number()) },
  returns: v.array(upcomingItem),
  handler: async (ctx, args) => {
    const today = parseYmd(args.today);
    const occasions = await ctx.db
      .query('occasions')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .take(MAX_OCCASIONS);

    const names = new Map<string, string>();
    const items = [];
    for (const occasion of occasions) {
      let name = names.get(occasion.recipientId);
      if (name === undefined) {
        const recipient = await ctx.db.get('recipients', occasion.recipientId);
        name = recipient?.name ?? 'Someone special';
        names.set(occasion.recipientId, name);
      }
      const next = nextOccurrence(occasion.month, occasion.day, today);
      items.push({
        occasion,
        recipientName: name,
        nextDate: `${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`,
        daysUntil: daysBetween(today, next),
      });
    }
    items.sort((a, b) => a.daysUntil - b.daysUntil);
    return items.slice(0, args.limit ?? 20);
  },
});

export const listForRecipient = authedQuery({
  args: { recipientId: v.id('recipients') },
  returns: v.array(occasionDoc),
  handler: async (ctx, args) => {
    await getOwnedRecipient(ctx, ctx.user._id, args.recipientId);
    return await ctx.db
      .query('occasions')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.recipientId))
      .take(50);
  },
});

export const create = authedMutation({
  args: { recipientId: v.id('recipients'), ...editableFields },
  returns: v.id('occasions'),
  handler: async (ctx, args) => {
    await getOwnedRecipient(ctx, ctx.user._id, args.recipientId);
    validate(args);
    return await ctx.db.insert('occasions', {
      ...args,
      label: args.label?.trim() || undefined,
      userId: ctx.user._id,
    });
  },
});

export const update = authedMutation({
  args: { occasionId: v.id('occasions'), ...editableFields },
  returns: v.null(),
  handler: async (ctx, { occasionId, ...fields }) => {
    const existing = await getOwnedOccasion(ctx, ctx.user._id, occasionId);
    validate(fields);
    const dateChanged = existing.month !== fields.month || existing.day !== fields.day;
    await ctx.db.patch('occasions', occasionId, {
      ...fields,
      label: fields.label?.trim() || undefined,
      lastScheduledYear: dateChanged ? undefined : existing.lastScheduledYear,
    });
    return null;
  },
});

export const remove = authedMutation({
  args: { occasionId: v.id('occasions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getOwnedOccasion(ctx, ctx.user._id, args.occasionId);
    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_occasion', (q) => q.eq('occasionId', args.occasionId))
      .collect();
    for (const gift of gifts) {
      if (gift.status === 'scheduled') await ctx.db.patch('gifts', gift._id, { status: 'canceled' });
    }
    await ctx.db.delete('occasions', args.occasionId);
    return null;
  },
});
