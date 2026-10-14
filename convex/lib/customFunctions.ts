import { ConvexError } from 'convex/values';
import { customAction, customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { internal } from '../_generated/api';
import type { Doc } from '../_generated/dataModel';
import { action, mutation, query } from '../_generated/server';
import { getCurrentUser } from './auth';

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return { ctx: { user }, args };
  },
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return { ctx: { user }, args };
  },
});

export const authedAction = customAction(action, {
  args: {},
  input: async (ctx, args): Promise<{ ctx: { user: Doc<'users'> }; args: Record<string, never> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    const user: Doc<'users'> | null = await ctx.runQuery(internal.users.getByClerkId, { clerkId: identity.subject });
    if (!user) throw new ConvexError('User profile not found. Please sign in again.');
    return { ctx: { user }, args };
  },
});
