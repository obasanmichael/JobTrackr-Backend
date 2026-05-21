-- V2F: plans, feature entitlements, subscriptions (Stripe-ready shell).

CREATE TYPE "BillingProvider" AS ENUM ('NONE', 'STRIPE');

CREATE TYPE "SubscriptionStatus" AS ENUM ('BETA', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBeta" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

CREATE UNIQUE INDEX "plans_stripePriceId_key" ON "plans"("stripePriceId");

CREATE TABLE "feature_entitlements" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "limitValue" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_entitlements_planId_featureKey_key" ON "feature_entitlements"("planId", "featureKey");

CREATE INDEX "feature_entitlements_planId_idx" ON "feature_entitlements"("planId");

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'BETA',
    "provider" "BillingProvider" NOT NULL DEFAULT 'NONE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "betaStartedAt" TIMESTAMP(3),
    "betaEndsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

ALTER TABLE "feature_entitlements" ADD CONSTRAINT "feature_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/* Deterministic plan ids for seeds & FK stability */
INSERT INTO "plans" ("id", "code", "name", "description", "priceMonthly", "currency", "stripePriceId", "isActive", "isBeta", "sortOrder", "updatedAt")
VALUES
  ('f1000000-0000-4000-8000-000000000001', 'BETA_FREE', 'Beta', 'Beta access — full features during preview.', NULL, 'usd', NULL, true, true, 10, CURRENT_TIMESTAMP),
  ('f1000000-0000-4000-8000-000000000002', 'FREE', 'Free', 'Free tier.', NULL, 'usd', NULL, true, false, 20, CURRENT_TIMESTAMP),
  ('f1000000-0000-4000-8000-000000000003', 'PRO', 'Pro', 'Professional subscription.', NULL, 'usd', NULL, true, false, 30, CURRENT_TIMESTAMP),
  ('f1000000-0000-4000-8000-000000000004', 'PREMIUM', 'Premium', 'Premium subscription.', NULL, 'usd', NULL, true, false, 40, CURRENT_TIMESTAMP);

/* Feature rows: feature keys align with billing.constants.ts */
INSERT INTO "feature_entitlements" ("id", "planId", "featureKey", "limitValue", "isEnabled", "updatedAt")
SELECT gen_random_uuid(), p.id, fk.key, NULL, true, CURRENT_TIMESTAMP
FROM "plans" p
CROSS JOIN (
  VALUES
    ('AI_RESUME_REVIEW'),
    ('JOB_MATCHING'),
    ('JOB_ALERTS'),
    ('RESUME_UPLOADS'),
    ('SAVED_JOBS'),
    ('CALENDAR_SYNC'),
    ('BROWSER_EXTENSION')
) AS fk(key);

INSERT INTO "subscriptions" ("id", "userId", "planId", "status", "provider", "updatedAt")
SELECT gen_random_uuid(), u.id, 'f1000000-0000-4000-8000-000000000001', 'BETA', 'NONE', CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "subscriptions" s WHERE s."userId" = u.id
);

