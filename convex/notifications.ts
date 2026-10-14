import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const sendToUser = internalAction({
  args: { userId: v.id('users'), title: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getById, { userId: args.userId });
    if (!user?.pushToken) return null;

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user.pushToken, title: args.title, body: args.body, sound: 'default' }),
      });
      if (!response.ok) console.warn('Expo push failed', response.status, await response.text());
    } catch (error) {
      console.warn('Expo push request error', error instanceof Error ? error.message : error);
    }
    return null;
  },
});
