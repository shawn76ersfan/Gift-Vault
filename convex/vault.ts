import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v, type Infer } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { authedMutation, authedQuery } from './lib/customFunctions';
import { ledgerDoc } from './lib/validators';
import type { ledgerType } from './schema';

const MAX_TOP_UP_CENTS = 100000;
const MAX_BALANCE_CENTS = 500000;

export async function addLedgerEntry(
  ctx: MutationCtx,
  entry: { userId: Id<'users'>; type: Infer<typeof ledgerType>; amountCents: number; giftId?: Id<'gifts'>; note?: string },
): Promise<number> {
  const user = await ctx.db.get('users', entry.userId);
  if (!user) throw new ConvexError('User not found');
  const delta = entry.type === 'gift_charge' ? -entry.amountCents : entry.amountCents;
  const balance = (user.vaultBalanceCents ?? 0) + delta;
  await ctx.db.insert('vaultLedger', entry);
  await ctx.db.patch('users', entry.userId, { vaultBalanceCents: balance });
  return balance;
}

export const summary = authedQuery({
  args: { monthStartMs: v.number() },
  returns: v.object({
    balanceCents: v.number(),
    monthlyBudgetCents: v.number(),
    spentThisMonthCents: v.number(),
    giftsSentThisMonth: v.number(),
    hasPaymentMethod: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_user_and_sendDate', (q) => q.eq('userId', ctx.user._id).gte('sendDate', args.monthStartMs))
      .take(500);
    const spent = gifts.filter((g) => g.status === 'charged' || g.status === 'sent');
    return {
      balanceCents: ctx.user.vaultBalanceCents ?? 0,
      monthlyBudgetCents: ctx.user.monthlyBudgetCents,
      spentThisMonthCents: spent.reduce((sum, g) => sum + g.amountCents, 0),
      giftsSentThisMonth: spent.filter((g) => g.status === 'sent').length,
      hasPaymentMethod: !!ctx.user.defaultPaymentMethodId,
    };
  },
});

export const history = authedQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(ledgerDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('vaultLedger')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const addFunds = authedMutation({
  args: { amountCents: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) throw new ConvexError('Enter an amount greater than $0');
    if (args.amountCents > MAX_TOP_UP_CENTS) throw new ConvexError('You can add up to $1,000 at a time');
    if ((ctx.user.vaultBalanceCents ?? 0) + args.amountCents > MAX_BALANCE_CENTS) {
      throw new ConvexError('Your vault budget can hold up to $5,000');
    }
    return await addLedgerEntry(ctx, {
      userId: ctx.user._id,
      type: 'budget_add',
      amountCents: args.amountCents,
      note: 'Added to gift budget',
    });
  },
});
