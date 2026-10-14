import { ConvexError } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

export async function getUserByClerkId(ctx: QueryCtx, clerkId: string): Promise<Doc<'users'> | null> {
  return await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', clerkId))
    .unique();
}

export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Not authenticated');
  const user = await getUserByClerkId(ctx, identity.subject);
  if (!user) throw new ConvexError('User profile not found. Please sign in again.');
  return user;
}
