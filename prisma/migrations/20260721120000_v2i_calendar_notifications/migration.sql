-- V2I + V2J: calendar integrations and in-app notifications

CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE');

CREATE TYPE "CalendarEventSourceType" AS ENUM ('INTERVIEW');

CREATE TYPE "CalendarEventSyncStatus" AS ENUM ('SYNCED', 'PENDING', 'FAILED');

CREATE TYPE "NotificationType" AS ENUM (
  'RESUME_REVIEW_COMPLETED',
  'JOB_MATCHES_AVAILABLE',
  'JOB_ALERT_DIGEST',
  'CALENDAR_SYNC_FAILED',
  'REMINDER_DUE',
  'INTERVIEW_UPCOMING',
  'GENERAL'
);

CREATE TABLE "calendar_integrations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "providerAccountEmail" TEXT,
  "accessTokenEncrypted" TEXT,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "scope" TEXT,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoSyncInterviews" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "sourceType" "CalendarEventSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "providerEventId" TEXT,
  "syncStatus" "CalendarEventSyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_integrations_userId_provider_key"
  ON "calendar_integrations"("userId", "provider");

CREATE INDEX "calendar_integrations_userId_idx"
  ON "calendar_integrations"("userId");

CREATE UNIQUE INDEX "calendar_events_integrationId_sourceType_sourceId_key"
  ON "calendar_events"("integrationId", "sourceType", "sourceId");

CREATE INDEX "calendar_events_userId_idx"
  ON "calendar_events"("userId");

CREATE INDEX "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

CREATE INDEX "notifications_userId_readAt_idx"
  ON "notifications"("userId", "readAt");

ALTER TABLE "calendar_integrations"
  ADD CONSTRAINT "calendar_integrations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
