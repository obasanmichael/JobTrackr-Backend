-- CreateEnum
CREATE TYPE "ResumeReviewType" AS ENUM ('GENERAL', 'JOB_SPECIFIC');

-- CreateEnum
CREATE TYPE "ResumeReviewStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ResumeReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "type" "ResumeReviewType" NOT NULL,
    "overallScore" INTEGER,
    "atsScore" INTEGER,
    "keywordScore" INTEGER,
    "structureScore" INTEGER,
    "clarityScore" INTEGER,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "missingKeywords" JSONB,
    "suggestions" JSONB,
    "improvedBullets" JSONB,
    "summary" TEXT,
    "rawAiOutput" JSONB,
    "status" "ResumeReviewStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeReview_userId_idx" ON "ResumeReview"("userId");

-- CreateIndex
CREATE INDEX "ResumeReview_resumeId_idx" ON "ResumeReview"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeReview_applicationId_idx" ON "ResumeReview"("applicationId");

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
