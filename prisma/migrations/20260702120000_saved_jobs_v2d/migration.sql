-- CreateEnum
CREATE TYPE "SavedJobStatus" AS ENUM ('SAVED', 'DISMISSED', 'CONVERTED_TO_APPLICATION');

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "status" "SavedJobStatus" NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "convertedApplicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_jobs_userId_idx" ON "saved_jobs"("userId");

-- CreateIndex
CREATE INDEX "saved_jobs_status_userId_idx" ON "saved_jobs"("status", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_userId_jobListingId_key" ON "saved_jobs"("userId", "jobListingId");

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_convertedApplicationId_fkey" FOREIGN KEY ("convertedApplicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
