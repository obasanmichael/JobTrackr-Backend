import { NotFoundException } from '@nestjs/common';
import {
  ExternalExperienceLevel,
  ExternalJobEmploymentType,
  ExternalJobRemoteType,
  JobSourceType,
  WorkMode,
} from '@prisma/client';
import type { ExternalJob } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: {
    externalJob: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const jobRow = {
    id: '22222222-2222-2222-8222-222222222222',
    sourceId: '11111111-1111-1111-8111-111111111111',
    sourceName: 'Stripe',
    externalJobId: 'gh-1',
    title: 'Software Engineer',
    company: 'Stripe',
    location: 'Remote, US',
    country: 'US',
    remoteType: ExternalJobRemoteType.REMOTE,
    salaryMin: 150000,
    salaryMax: 200000,
    currency: 'USD',
    description: 'Build payments infrastructure.',
    requirements: '5+ years experience',
    employmentType: ExternalJobEmploymentType.FULL_TIME,
    experienceLevel: ExternalExperienceLevel.SENIOR,
    applicationUrl: 'https://jobs.example/stripe/1',
    postedAt: new Date('2026-05-01T00:00:00.000Z'),
    expiresAt: null,
    rawPayload: {},
    contentHash: 'abc',
    isActive: true,
    isSuspicious: false,
    qualityFlags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies ExternalJob;

  beforeEach(() => {
    prisma = {
      externalJob: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
        Promise.all(ops),
      ),
    };
    service = new JobsService(prisma as unknown as PrismaService);
  });

  it('returns paginated search results', async () => {
    prisma.externalJob.count.mockResolvedValueOnce(1);
    prisma.externalJob.findMany.mockResolvedValueOnce([
      {
        ...jobRow,
        source: { name: 'Stripe', type: JobSourceType.ATS_FEED },
      },
    ]);

    const result = await service.search({ q: 'engineer', page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.jobs[0]).toEqual(
      expect.objectContaining({
        id: jobRow.id,
        title: 'Software Engineer',
        companyName: 'Stripe',
        workMode: WorkMode.REMOTE,
        applyUrl: 'https://jobs.example/stripe/1',
        source: 'Stripe',
        sourceMeta: {
          name: 'Stripe',
          type: JobSourceType.ATS_FEED,
        },
      }),
    );
    expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isSuspicious: false }),
        include: expect.objectContaining({
          source: expect.objectContaining({
            select: { name: true, type: true },
          }),
        }),
        skip: 0,
        take: 20,
      }),
    );
  });

  it('returns job detail for active listing', async () => {
    prisma.externalJob.findFirst.mockResolvedValueOnce({
      ...jobRow,
      source: { name: 'Stripe', type: JobSourceType.ATS_FEED },
    });

    const detail = await service.findActiveById(jobRow.id);

    expect(detail.description).toBe('Build payments infrastructure.');
    expect(detail.experienceLevel).toBe(ExternalExperienceLevel.SENIOR);
    expect(detail.employmentType).toBe(ExternalJobEmploymentType.FULL_TIME);
    expect(detail.sourceMeta).toEqual({
      name: 'Stripe',
      type: JobSourceType.ATS_FEED,
    });
  });

  it('throws NotFound when job is missing or inactive', async () => {
    prisma.externalJob.findFirst.mockResolvedValueOnce(null);

    await expect(service.findActiveById(jobRow.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
