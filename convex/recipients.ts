import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { authedMutation, authedQuery } from './lib/customFunctions';
import { recipientDoc } from './lib/validators';

const MAX_RECIPIENTS = 200;

const recipientFields = {
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  relationship: v.optional(v.string()),
  notes: v.optional(v.string()),
};

type RecipientInput = {
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  notes?: string;
};

function clean(input: RecipientInput): RecipientInput {
  const name = input.name.trim();
  if (name.length < 1) throw new ConvexError('Name is required');
  if (name.length > 80) throw new ConvexError('Name must be under 80 characters');
  const email = input.email?.trim() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Please enter a valid email address');
  return {
    name,
    email,
    phone: input.phone?.trim() || undefined,
    relationship: input.relationship?.trim() || undefined,
    notes: input.notes?.trim().slice(0, 500) || undefined,
  };
}

export async function getOwnedRecipient(
  ctx: Pick<QueryCtx, 'db'>,
  userId: Id<'users'>,
  recipientId: Id<'recipients'>,
): Promise<Doc<'recipients'>> {
  const recipient = await ctx.db.get('recipients', recipientId);
  if (!recipient || recipient.userId !== userId) throw new ConvexError('Recipient not found');
  return recipient;
}

export const list = authedQuery({
  args: {},
  returns: v.array(recipientDoc),
  handler: async (ctx) => {
    const recipients = await ctx.db
      .query('recipients')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .take(MAX_RECIPIENTS);
    return recipients.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = authedQuery({
  args: { recipientId: v.id('recipients') },
  returns: v.union(recipientDoc, v.null()),
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get('recipients', args.recipientId);
    if (!recipient || recipient.userId !== ctx.user._id) return null;
    return recipient;
  },
});

export const create = authedMutation({
  args: recipientFields,
  returns: v.id('recipients'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('recipients')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .take(MAX_RECIPIENTS);
    if (existing.length >= MAX_RECIPIENTS) throw new ConvexError(`You can save up to ${MAX_RECIPIENTS} people`);
    return await ctx.db.insert('recipients', { userId: ctx.user._id, ...clean(args) });
  },
});

export const update = authedMutation({
  args: { recipientId: v.id('recipients'), ...recipientFields },
  returns: v.null(),
  handler: async (ctx, { recipientId, ...fields }) => {
    await getOwnedRecipient(ctx, ctx.user._id, recipientId);
    await ctx.db.patch('recipients', recipientId, clean(fields));
    return null;
  },
});

export const remove = authedMutation({
  args: { recipientId: v.id('recipients') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getOwnedRecipient(ctx, ctx.user._id, args.recipientId);
    const occasions = await ctx.db
      .query('occasions')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.recipientId))
      .collect();
    for (const occasion of occasions) await ctx.db.delete('occasions', occasion._id);

    const pending = await ctx.db
      .query('gifts')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.recipientId))
      .collect();
    for (const gift of pending) {
      if (gift.status === 'scheduled') await ctx.db.patch('gifts', gift._id, { status: 'canceled' });
    }

    await ctx.db.delete('recipients', args.recipientId);
    return null;
  },
});
