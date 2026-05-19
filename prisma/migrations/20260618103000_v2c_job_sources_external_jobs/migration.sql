-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('API', 'ATS_FEED', 'MANUAL', 'SCRAPER_LATER');

-- CreateEnum
CREATE TYPE "ExternalJobRemoteType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ExternalJobEmploymentType" AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'TEMPORARY',
  'UNSPECIFIED'
);

-- CreateEnum
CREATE TYPE "ExternalExperienceLevel" AS ENUM (
  'ENTRY',
  'MID',
  'SENIOR',
  'LEAD',
  'EXECUTIVE',
  'UNSPECIFIED'
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobSourceType" NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJob" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "remoteType" "ExternalJobRemoteType" NOT NULL DEFAULT 'UNSPECIFIED',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "description" TEXT,
    "requirements" TEXT,
    "employmentType" "ExternalJobEmploymentType" NOT NULL DEFAULT 'UNSPECIFIED',
    "experienceLevel" "ExternalExperienceLevel" NOT NULL DEFAULT 'UNSPECIFIED',
    "applicationUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "contentHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSource_isActive_idx" ON "JobSource"("isActive");

-- CreateIndex
CREATE INDEX "ExternalJob_sourceId_idx" ON "ExternalJob"("sourceId");

-- CreateIndex
CREATE INDEX "ExternalJob_isActive_idx" ON "ExternalJob"("isActive");

-- CreateIndex
CREATE INDEX "ExternalJob_postedAt_idx" ON "ExternalJob"("postedAt");

-- CreateIndex
CREATE INDEX "ExternalJob_company_idx" ON "ExternalJob"("company");

-- CreateIndex
CREATE INDEX "ExternalJob_contentHash_idx" ON "ExternalJob"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJob_sourceId_externalJobId_key" ON "ExternalJob"("sourceId", "externalJobId");

-- AddForeignKey
ALTER TABLE "ExternalJob"
ADD CONSTRAINT "ExternalJob_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
