import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature) return new Response('Missing signature', { status: 400 });
    const ok = await ctx.runAction(internal.stripe.handleWebhook, { payload: await request.text(), signature });
    return new Response(null, { status: ok ? 200 : 400 });
  }),
});

http.route({
  path: '/clerk/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const id = request.headers.get('svix-id');
    const timestamp = request.headers.get('svix-timestamp');
    const signature = request.headers.get('svix-signature');
    if (!id || !timestamp || !signature) return new Response('Missing signature', { status: 400 });
    const ok = await ctx.runAction(internal.clerk.handleWebhook, {
      payload: await request.text(),
      headers: { id, timestamp, signature },
    });
    return new Response(null, { status: ok ? 200 : 400 });
  }),
});

export default http;
