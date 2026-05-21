# Billing & entitlements API (V2F)

See **`job-trackr-backend/V2F_BILLING_IMPLEMENTATION_PLAN.md`** for phase checklist and Stripe test notes.

Authenticated routes use header `Authorization: Bearer <jwt>`.

```http
GET  /billing/plans
GET  /billing/me
POST /billing/create-checkout-session
POST /billing/customer-portal
POST /billing/webhook
GET  /entitlements/me
```

`POST /billing/webhook` expects **raw JSON body** (`Stripe-Signature` header). Nest must bootstrap with **`rawBody: true`**.
