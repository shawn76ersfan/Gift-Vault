# GiftVault

GiftVault makes gift-giving effortless. Set a gift budget, add the people you care about and their special dates, and GiftVault automatically sends them a digital gift card right on time.

Built with Expo (React Native) for iOS and Android, Convex for the backend, Clerk for sign-in, Stripe for payments, and Tremendous for gift card delivery.

## How it works

1. **Vault budget.** Users fund a virtual vault (a spending budget, not stored money) and save a card with Stripe. The card is only charged when a gift actually goes out.
2. **People and dates.** Users add recipients (name and email) and occasions: birthdays, anniversaries, holidays, or custom dates. Each occasion has an amount, a lead time, and an auto-send toggle.
3. **Auto-gifting.** A daily Convex cron finds occasions coming up within each one's lead time. It creates a scheduled gift and notifies the user, who can cancel until the send time.
4. **Delivery.** At send time, Convex charges the saved card off-session through Stripe. Then it orders a Tremendous gift card emailed to the recipient. If delivery fails, the charge is refunded automatically.

Gift lifecycle: `scheduled` → `charging` → `charged` → `sent`. Side exits are `failed` (with a reason, and a refund when needed) and `canceled`.

## Project layout

```
src/app/          Expo Router screens (onboarding, sign-in, tabs, modals)
src/components/   Animated UI building blocks (VaultHero, carousel, confetti, tab bar...)
src/theme/        Colors, typography, spacing, motion tokens; light/dark mode
src/lib/          Hooks: auth flow, Stripe Payment Sheet, push registration, formatting
convex/           Backend: schema, queries/mutations, Stripe + Tremendous actions, webhooks, cron
```

## Prerequisites

- Node.js **20.19.4 or newer** (Expo SDK 57 requirement)
- Accounts: [Convex](https://convex.dev), [Clerk](https://clerk.com), [Stripe](https://stripe.com), [Tremendous](https://www.tremendous.com) (sandbox), and [Expo / EAS](https://expo.dev)
- Xcode (iOS) and/or Android Studio, or use EAS cloud builds

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Clerk

1. Create a Clerk application and enable **Email** with **email verification code**.
2. Go to **JWT templates**, choose **New template → Convex**, and keep the name `convex`. Copy its **Issuer** URL.
3. Copy the publishable key into `.env.local` as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

### 3. Convex

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex dev
```

`npx convex dev` writes `CONVEX_DEPLOYMENT` and `EXPO_PUBLIC_CONVEX_URL` into `.env.local` and keeps your functions synced. Leave it running during development. (`npx convex deploy` is for production only.)

The issuer domain must be set before the first push, because `convex/auth.config.ts` depends on it.

### 4. Stripe

1. Put the **test** publishable key in `.env.local` as `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. `npx convex env set STRIPE_SECRET_KEY sk_test_...`
3. Add a webhook endpoint at `https://<your-deployment>.convex.site/stripe/webhook` for these events:
   - `setup_intent.succeeded`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. `npx convex env set STRIPE_WEBHOOK_SECRET whsec_...`

The `.convex.site` URL is shown in the Convex dashboard under **Settings → URL & deploy key** (HTTP Actions URL).

### 5. Tremendous (sandbox)

1. Sign up at [testflight.tremendous.com](https://testflight.tremendous.com) and create an API key.
2. Look up your funding source ID (the sandbox includes a test balance).

```bash
npx convex env set TREMENDOUS_API_KEY TEST_...
npx convex env set TREMENDOUS_FUNDING_SOURCE_ID ...
# optional
npx convex env set TREMENDOUS_CAMPAIGN_ID ...
npx convex env set TREMENDOUS_PRODUCT_IDS id1,id2
```

Requests go to the sandbox until you set `TREMENDOUS_ENV=production`.

### 6. Clerk webhook (recommended)

This keeps the Convex user in sync when someone changes their name or email, or deletes their account.

1. In Clerk, go to **Webhooks** and add the endpoint `https://<your-deployment>.convex.site/clerk/webhook`. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
2. `npx convex env set CLERK_WEBHOOK_SECRET whsec_...`

## Running the app

Stripe's native SDK and push notifications do not run in Expo Go, so use a **development build**:

```bash
npm install -g eas-cli
eas login
eas init                     # links the project and adds the EAS projectId used for push tokens
eas build --profile development --platform ios       # or android / development-simulator
npm start                    # then open the installed dev build
```

To build locally instead: `npx expo run:ios` or `npx expo run:android`.

Test card: `4242 4242 4242 4242`, any future date, any CVC. Use `4000 0027 6000 3184` to exercise the 3-D Secure failure path.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run convex` | `convex dev`: sync backend functions |
| `npm run lint` | ESLint (Expo and Convex rules) |
| `npm run typecheck` | Type-check the app and the Convex backend |

## Build profiles (`eas.json`)

- `development`: dev client, internal distribution
- `development-simulator`: dev client for the iOS simulator
- `preview`: internal test build (Android APK)
- `production`: store builds with auto-incremented build numbers

Before shipping, set `EXPO_PUBLIC_*` values as EAS environment variables (`eas env:create`). Switch Stripe and Tremendous to live keys. Then run `npx convex deploy`.

## Notes and limits

- Gift amounts are $5 to $500. A single vault top-up can be up to $1,000, and the vault balance is capped at $5,000.
- Gifts are sent at 14:00 UTC on their send date.
- February 29 occasions are sent on February 28 in non-leap years.
