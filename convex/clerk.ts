'use node';

import { v } from 'convex/values';
import { Webhook } from 'svix';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

type ClerkUserEvent = {
  type: string;
  data: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string;
    primary_email_address_id?: string | null;
    email_addresses?: { id: string; email_address: string }[];
  };
};

export const handleWebhook = internalAction({
  args: { payload: v.string(), headers: v.object({ id: v.string(), timestamp: v.string(), signature: v.string() }) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error('CLERK_WEBHOOK_SECRET is not set');
      return false;
    }

    let event: ClerkUserEvent;
    try {
      const verified: unknown = new Webhook(secret).verify(args.payload, {
        'svix-id': args.headers.id,
        'svix-timestamp': args.headers.timestamp,
        'svix-signature': args.headers.signature,
      });
      event = verified as ClerkUserEvent;
    } catch (error) {
      console.error('Invalid Clerk webhook signature', error instanceof Error ? error.message : error);
      return false;
    }

    const clerkId = event.data.id;
    if (!clerkId) return true;

    if (event.type === 'user.created' || event.type === 'user.updated') {
      const emails = event.data.email_addresses ?? [];
      const primary = emails.find((e) => e.id === event.data.primary_email_address_id) ?? emails[0];
      const name = [event.data.first_name, event.data.last_name].filter(Boolean).join(' ');
      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId,
        email: primary?.email_address ?? '',
        name: name || primary?.email_address.split('@')[0] || 'Friend',
        imageUrl: event.data.image_url,
      });
    } else if (event.type === 'user.deleted') {
      await ctx.runMutation(internal.users.deleteFromClerk, { clerkId });
    }
    return true;
  },
});
