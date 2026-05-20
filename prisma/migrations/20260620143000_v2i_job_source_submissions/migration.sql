-- Phase I: organic careers page submissions queue

CREATE TYPE "JobSourceSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');

CREATE TABLE "JobSourceSubmission" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "careersUrl" TEXT NOT NULL,
    "submitterEmail" TEXT,
    "submitterUserId" TEXT,
    "detectedAtsType" TEXT,
    "detectedSlug" TEXT,
    "status" "JobSourceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "jobSourceId" TEXT,
    "reviewerNotes" TEXT,
    "submitterIp" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSourceSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobSourceSubmission_status_createdAt_idx" ON "JobSourceSubmission"("status", "createdAt");

CREATE INDEX "JobSourceSubmission_careersUrl_idx" ON "JobSourceSubmission"("careersUrl");

ALTER TABLE "JobSourceSubmission" ADD CONSTRAINT "JobSourceSubmission_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobSourceSubmission" ADD CONSTRAINT "JobSourceSubmission_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
