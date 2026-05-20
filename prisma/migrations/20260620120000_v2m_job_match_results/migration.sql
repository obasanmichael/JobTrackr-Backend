-- Phase M: heuristic job match results cache

CREATE TABLE "JobMatchResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "titleScore" INTEGER NOT NULL,
    "skillScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "locationScore" INTEGER NOT NULL,
    "recencyScore" INTEGER NOT NULL,
    "matchedSkills" JSONB,
    "missingSkills" JSONB,
    "matchReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMatchResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobMatchResult_userId_externalJobId_key" ON "JobMatchResult"("userId", "externalJobId");

CREATE INDEX "JobMatchResult_userId_overallScore_idx" ON "JobMatchResult"("userId", "overallScore");

CREATE INDEX "JobMatchResult_candidateProfileId_idx" ON "JobMatchResult"("candidateProfileId");

ALTER TABLE "JobMatchResult" ADD CONSTRAINT "JobMatchResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobMatchResult" ADD CONSTRAINT "JobMatchResult_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobMatchResult" ADD CONSTRAINT "JobMatchResult_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
