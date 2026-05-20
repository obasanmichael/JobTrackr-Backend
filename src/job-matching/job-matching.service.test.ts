import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ExternalExperienceLevel,
  ExternalJobEmploymentType,
  ExternalJobRemoteType,
} from '@prisma/client';
import type { CandidateProfile, ExternalJob } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { JobMatchingService } from './job-matching.service';

describe('JobMatchingService', () => {
  let service: JobMatchingService;
  let prisma: {
    resume: { findFirst: jest.Mock };
    candidateProfile: { findFirst: jest.Mock };
    externalJob: { findMany: jest.Mock; findFirst: jest.Mock };
    jobMatchResult: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const user = { userId: 'user-1', email: 'a@example.com' };

  const profile = {
    id: 'profile-1',
    userId: 'user-1',
    resumeId: 'resume-1',
    skills: ['React', 'TypeScript'],
    tools: ['PostgreSQL'],
    roles: ['Software Engineer'],
    locations: ['Remote'],
    workModes: ['REMOTE'],
    yearsOfExperience: 5,
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  } as CandidateProfile;

  const job = {
    id: 'job-1',
    sourceId: 'source-1',
    sourceName: 'Stripe',
    externalJobId: 'gh-1',
    title: 'Senior Software Engineer',
    company: 'Stripe',
    location: 'Remote',
    country: 'US',
    remoteType: ExternalJobRemoteType.REMOTE,
    salaryMin: 150000,
    salaryMax: 200000,
    currency: 'USD',
    description: 'React and TypeScript backend work.',
    requirements: null,
    employmentType: ExternalJobEmploymentType.FULL_TIME,
    experienceLevel: ExternalExperienceLevel.SENIOR,
    applicationUrl: 'https://jobs.example/1',
    postedAt: new Date('2026-05-18T00:00:00.000Z'),
    expiresAt: null,
    rawPayload: null,
    contentHash: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ExternalJob;

  beforeEach(() => {
    prisma = {
      resume: { findFirst: jest.fn().mockResolvedValue({ candidateProfile: profile }) },
      candidateProfile: { findFirst: jest.fn() },
      externalJob: {
        findMany: jest.fn().mockResolvedValue([job]),
        findFirst: jest.fn().mockResolvedValue(job),
      },
      jobMatchResult: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    service = new JobMatchingService(prisma as unknown as PrismaService);
  });

  it('returns requiresProfile when no candidate profile exists', async () => {
    prisma.resume.findFirst.mockResolvedValueOnce(null);
    prisma.candidateProfile.findFirst.mockResolvedValueOnce(null);

    const result = await service.listMatches(user);

    expect(result.requiresProfile).toBe(true);
    expect(result.matches).toEqual([]);
  });

  it('generates and persists ranked matches', async () => {
    const result = await service.generateMatches(user);

    expect(result.requiresProfile).toBe(false);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].overallScore).toBeGreaterThan(0);
    expect(prisma.jobMatchResult.upsert).toHaveBeenCalled();
  });

  it('throws conflict when generating without profile', async () => {
    prisma.resume.findFirst.mockResolvedValueOnce(null);
    prisma.candidateProfile.findFirst.mockResolvedValueOnce(null);

    await expect(service.generateMatches(user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('scores a single job for a user', async () => {
    const result = await service.matchJobForUser(user, job.id);

    expect(result.requiresProfile).toBe(false);
    expect(result.job.id).toBe(job.id);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('throws not found for missing job', async () => {
    prisma.externalJob.findFirst.mockResolvedValueOnce(null);

    await expect(service.matchJobForUser(user, job.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
