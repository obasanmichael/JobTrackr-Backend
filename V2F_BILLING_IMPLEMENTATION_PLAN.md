# Phase V2F — Plans, subscriptions, entitlements, Stripe shell

Mirrors **`job-trackr-backend-v2-prd-implementation-plan.md`** Phase V2F / §6.5 billing endpoints. Charging can stay **disabled** until Stripe test keys are set.

## Success subphases

| Id | Goal | Deliverable |
|----|------|---------------|
| **F.1** | Catalog + subscription state | `Plan`, `FeatureEntitlement`, `Subscription` (+ migration seeds) |
| **F.2** | Default tier | Every user gets **BETA_FREE** (`SubscriptionProvisioningService` + register hook + migration backfill) |
| **F.3** | Entitlements resolution | `EntitlementsService` + `GET /entitlements/me` |
| **F.4** | Read billing state | `GET /billing/me` |
| **F.5** | Plan listing | **`GET /billing/plans` (public, no JWT)** |
| **F.6** | Stripe shell (test/live) | `POST /billing/create-checkout-session`, `POST /billing/customer-portal`, `POST /billing/webhook` |
| **F.7** | Raw webhook body | **`NestFactory.create(AppModule, { rawBody: true })`** |
| **F.8** | Premium guard example | Resume AI quota honours plan `limitValue` + `assertFeatureEnabled` |
| **F.9** | Module wiring | `BillingModule` in `AppModule`; **Auth ↔ Billing** `forwardRef` + exported `JwtAuthGuard` |

## API surface (`/api/v1`)

```http
GET  /billing/plans                    # Public
GET  /billing/me                       # JWT
POST /billing/create-checkout-session  # JWT
POST /billing/customer-portal         # JWT
POST /billing/webhook                 # Stripe signature (no JWT)
GET  /entitlements/me                  # JWT
```

## Stripe test setup (short)

1. Create **Stripe test** Prices for PRO / PREMIUM (Billing → Products → Prices).
2. Set **`STRIPE_SECRET_KEY`** (sk_test_…).
3. Set **`STRIPE_WEBHOOK_SECRET`** from CLI `stripe listen` or Dashboard endpoint.
4. Point webhook URL to **`{API}/api/v1/billing/webhook`** (`POST`).
5. Optional: `Plan.stripePriceId` in DB **or** env **`STRIPE_PRICE_<PLANCODE>`** / **`STRIPE_PRICE_PRO_MONTHLY`**.
6. Set **`FRONTEND_URL`** for Checkout return URLs (`/dashboard/billing` fallbacks).

## Follow-ups

- Admin **subscriptions** overrides (Phase V2G).
- Persist Stripe **event ids** for idempotent webhooks.
- Tax / EU VAT, invoices, Seat-based plans.
