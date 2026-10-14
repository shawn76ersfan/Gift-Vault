import { ConvexError, v } from 'convex/values';

import { internalMutation, internalQuery, mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getUserByClerkId } from './lib/auth';
import { authedMutation } from './lib/customFunctions';
import { userDoc } from './lib/validators';

const DEFAULT_MONTHLY_BUDGET_CENTS = 10000;
const MAX_MONTHLY_BUDGET_CENTS = 500000;

async function upsertUser(
  ctx: MutationCtx,
  profile: { clerkId: string; email: string; name: string; imageUrl?: string },
): Promise<Id<'users'>> {
  const existing = await getUserByClerkId(ctx, profile.clerkId);
  if (existing) {
    await ctx.db.patch('users', existing._id, {
      email: profile.email,
      name: profile.name,
      imageUrl: profile.imageUrl,
    });
    return existing._id;
  }
  return await ctx.db.insert('users', { ...profile, monthlyBudgetCents: DEFAULT_MONTHLY_BUDGET_CENTS });
}

export const store = mutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    return await upsertUser(ctx, {
      clerkId: identity.subject,
      email: identity.email ?? '',
      name: identity.name ?? identity.givenName ?? identity.email?.split('@')[0] ?? 'Friend',
      imageUrl: identity.pictureUrl,
    });
  },
});

export const current = query({
  args: {},
  returns: v.union(userDoc, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await getUserByClerkId(ctx, identity.subject);
  },
});

export const setMonthlyBudget = authedMutation({
  args: { monthlyBudgetCents: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.monthlyBudgetCents) || args.monthlyBudgetCents < 0) {
      throw new ConvexError('Budget must be a positive whole number of cents');
    }
    if (args.monthlyBudgetCents > MAX_MONTHLY_BUDGET_CENTS) {
      throw new ConvexError('Monthly budget can be at most $5,000');
    }
    await ctx.db.patch('users', ctx.user._id, { monthlyBudgetCents: args.monthlyBudgetCents });
    return null;
  },
});

export const setPushToken = authedMutation({
  args: { pushToken: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('users', ctx.user._id, { pushToken: args.pushToken ?? undefined });
    return null;
  },
});

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(userDoc, v.null()),
  handler: async (ctx, args) => await getUserByClerkId(ctx, args.clerkId),
});

export const getById = internalQuery({
  args: { userId: v.id('users') },
  returns: v.union(userDoc, v.null()),
  handler: async (ctx, args) => await ctx.db.get('users', args.userId),
});

export const upsertFromClerk = internalMutation({
  args: { clerkId: v.string(), email: v.string(), name: v.string(), imageUrl: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertUser(ctx, args);
    return null;
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) return null;

    const occasions = await ctx.db.query('occasions').withIndex('by_user', (q) => q.eq('userId', user._id)).collect();
    for (const o of occasions) await ctx.db.delete('occasions', o._id);

    const recipients = await ctx.db.query('recipients').withIndex('by_user', (q) => q.eq('userId', user._id)).collect();
    for (const r of recipients) await ctx.db.delete('recipients', r._id);

    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_user_and_sendDate', (q) => q.eq('userId', user._id))
      .collect();
    for (const g of gifts) await ctx.db.delete('gifts', g._id);

    const ledger = await ctx.db.query('vaultLedger').withIndex('by_user', (q) => q.eq('userId', user._id)).collect();
    for (const entry of ledger) await ctx.db.delete('vaultLedger', entry._id);

    await ctx.db.delete('users', user._id);
    return null;
  },
});

export const setStripeCustomer = internalMutation({
  args: { userId: v.id('users'), stripeCustomerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('users', args.userId, { stripeCustomerId: args.stripeCustomerId });
    return null;
  },
});

export const setDefaultPaymentMethod = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    paymentMethodId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_stripeCustomerId', (q) => q.eq('stripeCustomerId', args.stripeCustomerId))
      .unique();
    if (!user) {
      console.warn('No user found for Stripe customer', args.stripeCustomerId);
      return null;
    }
    await ctx.db.patch('users', user._id, {
      defaultPaymentMethodId: args.paymentMethodId,
      cardBrand: args.cardBrand,
      cardLast4: args.cardLast4,
      autoChargeConsentAt: user.autoChargeConsentAt ?? Date.now(),
    });
    return null;
  },
});

export const clearPaymentMethod = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('users', args.userId, {
      defaultPaymentMethodId: undefined,
      cardBrand: undefined,
      cardLast4: undefined,
      autoChargeConsentAt: undefined,
    });
    return null;
  },
});
