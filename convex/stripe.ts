'use node';

import { v } from 'convex/values';
import Stripe from 'stripe';

import { internal } from './_generated/api';
import { internalAction, type ActionCtx } from './_generated/server';
import { authedAction } from './lib/customFunctions';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Payments are not configured yet (missing STRIPE_SECRET_KEY)');
  return new Stripe(key);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

async function savePaymentMethod(ctx: ActionCtx, stripe: Stripe, customerId: string, paymentMethodId: string) {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  await ctx.runMutation(internal.users.setDefaultPaymentMethod, {
    stripeCustomerId: customerId,
    paymentMethodId,
    cardBrand: pm.card?.brand,
    cardLast4: pm.card?.last4,
  });
  return { brand: pm.card?.brand ?? 'card', last4: pm.card?.last4 ?? '' };
}

export const createSetupIntent = authedAction({
  args: {},
  returns: v.object({
    setupIntentClientSecret: v.string(),
    ephemeralKeySecret: v.string(),
    customerId: v.string(),
  }),
  handler: async (ctx) => {
    const stripe = getStripe();
    let customerId = ctx.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: ctx.user.email || undefined, name: ctx.user.name, metadata: { userId: ctx.user._id } },
        { idempotencyKey: `customer-${ctx.user._id}` },
      );
      customerId = customer.id;
      await ctx.runMutation(internal.users.setStripeCustomer, { userId: ctx.user._id, stripeCustomerId: customerId });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: '2024-06-20' });
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: { userId: ctx.user._id },
    });

    if (!setupIntent.client_secret || !ephemeralKey.secret) throw new Error('Stripe did not return a client secret');
    return {
      setupIntentClientSecret: setupIntent.client_secret,
      ephemeralKeySecret: ephemeralKey.secret,
      customerId,
    };
  },
});

export const syncPaymentMethod = authedAction({
  args: {},
  returns: v.union(v.null(), v.object({ brand: v.string(), last4: v.string() })),
  handler: async (ctx) => {
    if (!ctx.user.stripeCustomerId) return null;
    const stripe = getStripe();
    const methods = await stripe.paymentMethods.list({ customer: ctx.user.stripeCustomerId, limit: 10 });
    const newest = [...methods.data].sort((a, b) => b.created - a.created)[0];
    if (!newest) return null;
    return await savePaymentMethod(ctx, stripe, ctx.user.stripeCustomerId, newest.id);
  },
});

export const removePaymentMethod = authedAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (ctx.user.defaultPaymentMethodId) {
      await getStripe().paymentMethods.detach(ctx.user.defaultPaymentMethodId);
    }
    await ctx.runMutation(internal.users.clearPaymentMethod, { userId: ctx.user._id });
    return null;
  },
});

export const chargeGift = internalAction({
  args: { giftId: v.id('gifts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const charge = await ctx.runMutation(internal.gifts.beginCharge, { giftId: args.giftId });
    if (!charge) return null;

    try {
      const intent = await getStripe().paymentIntents.create(
        {
          amount: charge.amountCents,
          currency: 'usd',
          customer: charge.customerId,
          payment_method: charge.paymentMethodId,
          off_session: true,
          confirm: true,
          description: `GiftVault gift card for ${charge.recipientName}`,
          metadata: { giftId: args.giftId },
        },
        { idempotencyKey: `gift-charge-${args.giftId}` },
      );
      await ctx.runMutation(internal.gifts.attachPaymentIntent, { giftId: args.giftId, paymentIntentId: intent.id });

      if (intent.status === 'succeeded') {
        await ctx.runMutation(internal.gifts.markCharged, { giftId: args.giftId });
      } else if (intent.status === 'requires_action' || intent.status === 'requires_payment_method') {
        await ctx.runMutation(internal.gifts.markFailed, {
          giftId: args.giftId,
          reason: 'Your bank needs you to confirm this payment. Please update your card in Settings.',
        });
      }
    } catch (error) {
      console.error('Gift charge failed', { giftId: args.giftId, error: errorMessage(error) });
      await ctx.runMutation(internal.gifts.markFailed, {
        giftId: args.giftId,
        reason: 'Your card was declined. Please update it in Settings.',
      });
    }
    return null;
  },
});

export const refundGift = internalAction({
  args: { giftId: v.id('gifts'), paymentIntentId: v.string(), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getStripe().refunds.create(
      { payment_intent: args.paymentIntentId, metadata: { giftId: args.giftId } },
      { idempotencyKey: `gift-refund-${args.giftId}` },
    );
    await ctx.runMutation(internal.gifts.markRefunded, { giftId: args.giftId, reason: args.reason });
    return null;
  },
});

export const handleWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return false;
    }
    const stripe = getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(args.payload, args.signature, secret);
    } catch (error) {
      console.error('Invalid Stripe webhook signature', errorMessage(error));
      return false;
    }

    switch (event.type) {
      case 'setup_intent.succeeded': {
        const intent = event.data.object;
        const customerId = typeof intent.customer === 'string' ? intent.customer : intent.customer?.id;
        const pmId = typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id;
        if (customerId && pmId) await savePaymentMethod(ctx, stripe, customerId, pmId);
        break;
      }
      case 'payment_intent.succeeded': {
        await ctx.runMutation(internal.gifts.markCharged, { paymentIntentId: event.data.object.id });
        break;
      }
      case 'payment_intent.payment_failed': {
        await ctx.runMutation(internal.gifts.markFailed, {
          paymentIntentId: event.data.object.id,
          reason: event.data.object.last_payment_error?.message ?? 'Your card was declined.',
        });
        break;
      }
      default:
        break;
    }
    return true;
  },
});
