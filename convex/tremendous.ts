import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

const BASE_URLS = {
  sandbox: 'https://testflight.tremendous.com/api/v2',
  production: 'https://www.tremendous.com/api/v2',
} as const;

type OrderResponse = { order?: { id?: string; status?: string } };
type ErrorResponse = { errors?: { message?: string } };

function config() {
  const apiKey = process.env.TREMENDOUS_API_KEY;
  const fundingSourceId = process.env.TREMENDOUS_FUNDING_SOURCE_ID;
  if (!apiKey || !fundingSourceId) {
    throw new Error('Gift card delivery is not configured (missing TREMENDOUS_API_KEY or TREMENDOUS_FUNDING_SOURCE_ID)');
  }
  const env = process.env.TREMENDOUS_ENV === 'production' ? 'production' : 'sandbox';
  const productIds = process.env.TREMENDOUS_PRODUCT_IDS?.split(',')
    .map((id: string) => id.trim())
    .filter(Boolean);
  return {
    apiKey,
    fundingSourceId,
    baseUrl: BASE_URLS[env],
    campaignId: process.env.TREMENDOUS_CAMPAIGN_ID,
    productIds,
  };
}

export const sendReward = internalAction({
  args: { giftId: v.id('gifts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.gifts.getForFulfillment, { giftId: args.giftId });
    if (!data || data.gift.status !== 'charged') return null;
    const { gift, recipient, user } = data;

    const fail = async (reason: string) => {
      if (gift.stripePaymentIntentId) {
        await ctx.runAction(internal.stripe.refundGift, {
          giftId: gift._id,
          paymentIntentId: gift.stripePaymentIntentId,
          reason,
        });
      } else {
        await ctx.runMutation(internal.gifts.markFailed, { giftId: gift._id, reason });
      }
    };

    if (!recipient.email) {
      await fail(`${recipient.name} has no email address.`);
      return null;
    }

    try {
      const { apiKey, fundingSourceId, baseUrl, campaignId, productIds } = config();
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_id: gift._id,
          payment: { funding_source_id: fundingSourceId },
          reward: {
            ...(campaignId ? { campaign_id: campaignId } : {}),
            ...(productIds?.length ? { products: productIds } : {}),
            value: { denomination: gift.amountCents / 100, currency_code: 'USD' },
            recipient: { name: recipient.name, email: recipient.email },
            delivery: { method: 'EMAIL' },
          },
          sender_name: user.name,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorResponse;
        console.error('Tremendous order failed', { giftId: gift._id, status: response.status, body });
        await fail(body.errors?.message ? `Gift card provider error: ${body.errors.message}.` : 'The gift card could not be issued.');
        return null;
      }

      const body = (await response.json()) as OrderResponse;
      await ctx.runMutation(internal.gifts.markSent, { giftId: gift._id, tremendousOrderId: body.order?.id ?? 'unknown' });
    } catch (error) {
      console.error('Tremendous request error', { giftId: gift._id, error: error instanceof Error ? error.message : error });
      await fail('The gift card service is unavailable right now.');
    }
    return null;
  },
});
