import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const occasionType = v.union(
  v.literal('birthday'),
  v.literal('anniversary'),
  v.literal('holiday'),
  v.literal('custom'),
);

export const giftStatus = v.union(
  v.literal('scheduled'),
  v.literal('charging'),
  v.literal('charged'),
  v.literal('sent'),
  v.literal('failed'),
  v.literal('canceled'),
);

export const ledgerType = v.union(v.literal('budget_add'), v.literal('gift_charge'), v.literal('refund'));

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    autoChargeConsentAt: v.optional(v.number()),
    monthlyBudgetCents: v.number(),
    vaultBalanceCents: v.optional(v.number()),
    pushToken: v.optional(v.string()),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_stripeCustomerId', ['stripeCustomerId']),

  recipients: defineTable({
    userId: v.id('users'),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index('by_user', ['userId']),

  occasions: defineTable({
    userId: v.id('users'),
    recipientId: v.id('recipients'),
    type: occasionType,
    label: v.optional(v.string()),
    month: v.number(),
    day: v.number(),
    amountCents: v.number(),
    leadDays: v.number(),
    autoSend: v.boolean(),
    lastScheduledYear: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_recipient', ['recipientId'])
    .index('by_month_day', ['month', 'day']),

  gifts: defineTable({
    userId: v.id('users'),
    recipientId: v.id('recipients'),
    occasionId: v.optional(v.id('occasions')),
    amountCents: v.number(),
    status: giftStatus,
    sendDate: v.number(),
    message: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    tremendousOrderId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  })
    .index('by_user_and_sendDate', ['userId', 'sendDate'])
    .index('by_status_and_sendDate', ['status', 'sendDate'])
    .index('by_occasion', ['occasionId'])
    .index('by_recipient', ['recipientId'])
    .index('by_paymentIntent', ['stripePaymentIntentId']),

  vaultLedger: defineTable({
    userId: v.id('users'),
    type: ledgerType,
    amountCents: v.number(),
    giftId: v.optional(v.id('gifts')),
    note: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_gift', ['giftId']),
});
