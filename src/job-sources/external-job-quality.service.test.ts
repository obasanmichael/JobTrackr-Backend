import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ExternalJobQualityService } from './external-job-quality.service';
import { EXTERNAL_JOB_QUALITY_FLAGS } from './quality/job-quality.constants';

describe('ExternalJobQualityService', () => {
  let service: ExternalJobQualityService;
  let prisma: {
    externalJob: {
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      externalJob: {
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((calls: Promise<unknown>[]) => Promise.all(calls)),
    };
    service = new ExternalJobQualityService(prisma as unknown as PrismaService);
  });

  it('flags suspicious active jobs during scan', async () => {
    prisma.externalJob.findMany.mockResolvedValueOnce([
      {
        id: 'job-1',
        applicationUrl: null,
        salaryMin: null,
        salaryMax: null,
        contentHash: null,
      },
      {
        id: 'job-2',
        applicationUrl: 'https://jobs.example/ok',
        salaryMin: 100000,
        salaryMax: 120000,
        contentHash: 'abc',
      },
    ]);
    prisma.externalJob.update.mockResolvedValue({});

    const result = await service.runQualityScan();

    expect(result.scannedCount).toBe(2);
    expect(result.suspiciousCount).toBe(1);
    expect(result.clearedCount).toBe(1);
    expect(result.flaggedByReason).toEqual({
      [EXTERNAL_JOB_QUALITY_FLAGS.MISSING_APPLICATION_URL]: 1,
    });
    expect(prisma.externalJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        isSuspicious: true,
        qualityFlags: [EXTERNAL_JOB_QUALITY_FLAGS.MISSING_APPLICATION_URL],
      },
    });
    expect(prisma.externalJob.update).toHaveBeenCalledWith({
      where: { id: 'job-2' },
      data: {
        isSuspicious: false,
        qualityFlags: Prisma.DbNull,
      },
    });
  });

  it('returns dry-run purge counts without deleting when disabled', async () => {
    const previous = process.env.EXTERNAL_JOB_PURGE_ENABLED;
    process.env.EXTERNAL_JOB_PURGE_ENABLED = 'false';
    prisma.externalJob.count.mockResolvedValueOnce(4);

    const result = await service.purgeInactiveExternalJobs({ dryRun: false });

    expect(result.enabled).toBe(false);
    expect(result.matchedCount).toBe(4);
    expect(result.deletedCount).toBe(0);
    expect(prisma.externalJob.deleteMany).not.toHaveBeenCalled();

    process.env.EXTERNAL_JOB_PURGE_ENABLED = previous;
  });

  it('rejects purge when disabled and not dry-run', () => {
    const previous = process.env.EXTERNAL_JOB_PURGE_ENABLED;
    process.env.EXTERNAL_JOB_PURGE_ENABLED = 'false';

    expect(() => service.assertPurgeEnabledOrDryRun(false)).toThrow(
      BadRequestException,
    );
    expect(() => service.assertPurgeEnabledOrDryRun(true)).not.toThrow();

    process.env.EXTERNAL_JOB_PURGE_ENABLED = previous;
  });
});
