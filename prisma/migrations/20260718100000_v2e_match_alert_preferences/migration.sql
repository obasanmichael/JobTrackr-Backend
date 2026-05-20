-- V2E: match alert preferences (thresholds + channels); delivery pipeline is separate.

CREATE TABLE "match_alert_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "minMatchScore" INTEGER NOT NULL DEFAULT 70,
    "channels" JSONB,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_alert_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_alert_preferences_userId_key" ON "match_alert_preferences"("userId");

ALTER TABLE "match_alert_preferences" ADD CONSTRAINT "match_alert_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
