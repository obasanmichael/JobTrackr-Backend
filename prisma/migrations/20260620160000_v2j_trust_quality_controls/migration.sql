-- Phase J: trust & quality controls

ALTER TABLE "JobSource" ADD COLUMN "consecutiveSyncFailures" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ExternalJob" ADD COLUMN "isSuspicious" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExternalJob" ADD COLUMN "qualityFlags" JSONB;

CREATE INDEX "ExternalJob_isSuspicious_idx" ON "ExternalJob"("isSuspicious");
