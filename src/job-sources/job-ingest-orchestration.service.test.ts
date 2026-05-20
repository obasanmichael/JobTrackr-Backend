import { BadGatewayException } from '@nestjs/common';
import { ExternalJobRemoteType, JobSourceType } from '@prisma/client';
import type { JobSourceSyncPort } from './sync/job-source-sync.port';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import type { PrismaService } from '../prisma/prisma.service';

const JOB_SOURCE_ROW = {
  id: '11111111-1111-1111-8111-111111111111',
  name: 'Test ATS',
  type: JobSourceType.API,
  baseUrl: 'https://example.com',
  isActive: true,
  requiresApiKey: false,
  config: { board_token: 'x' },
  lastSyncAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JobIngestOrchestrationService', () => {
  let prisma: {
    jobSource: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    externalJob: { upsert: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let port: jest.Mocked<Pick<JobSourceSyncPort, 'fetchSnapshot'>>;

  const buildService = (): JobIngestOrchestrationService => {
    return new JobIngestOrchestrationService(
      prisma as unknown as PrismaService,
      {
        fetchSnapshot: port.fetchSnapshot,
      },
    );
  };

  beforeEach(() => {
    port = {
      fetchSnapshot: jest.fn(),
    };

    prisma = {
      jobSource: {
        findUnique: jest.fn().mockResolvedValue(JOB_SOURCE_ROW),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      externalJob: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((calls: Promise<unknown>[]) => Promise.all(calls)),
    };
  });

  it('returns zero counts when snapshot is empty', async () => {
    port.fetchSnapshot.mockResolvedValue({ rawListings: [] });

    const service = buildService();

    await expect(service.syncExternalJobs(JOB_SOURCE_ROW.id)).resolves.toEqual({
      upsertedCount: 0,
      skippedInvalid: 0,
      inactivatedCount: 0,
      syncedAt: expect.any(Date),
      durationMs: expect.any(Number),
    });

    expect(prisma.externalJob.upsert).not.toHaveBeenCalled();
    expect(prisma.externalJob.updateMany).toHaveBeenCalledWith({
      where: {
        sourceId: JOB_SOURCE_ROW.id,
        isActive: true,
      },
      data: { isActive: false },
    });
    expect(prisma.jobSource.update).toHaveBeenCalledWith({
      where: { id: JOB_SOURCE_ROW.id },
      data: expect.objectContaining({
        lastSuccessAt: expect.any(Date),
        lastErrorAt: null,
        lastErrorMessage: null,
      }),
    });
  });

  it('upserts validated rows in chunks', async () => {
    port.fetchSnapshot.mockResolvedValue({
      rawListings: [
        {
          externalJobId: 'a',
          title: 'T1',
          company: 'C1',
          applicationUrl: 'https://jobs.example/a',
        },
        {
          externalJobId: 'b',
          title: 'T2',
          company: 'C2',
          applicationUrl: 'https://jobs.example/b',
        },
      ],
    });

    const service = buildService();

    const result = await service.syncExternalJobs(JOB_SOURCE_ROW.id);

    expect(result).toEqual({
      upsertedCount: 2,
      skippedInvalid: 0,
      inactivatedCount: 0,
      syncedAt: expect.any(Date),
      durationMs: expect.any(Number),
    });
    expect(prisma.externalJob.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.externalJob.updateMany).toHaveBeenCalledWith({
      where: {
        sourceId: JOB_SOURCE_ROW.id,
        isActive: true,
        externalJobId: { notIn: ['a', 'b'] },
      },
      data: { isActive: false },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('counts skipped invalid listings', async () => {
    port.fetchSnapshot.mockResolvedValue({
      rawListings: [
        { bogus: true },
        {
          externalJobId: 'ok',
          title: 'T',
          company: 'Co',
          applicationUrl: 'https://jobs.example/ok',
          remoteType: ExternalJobRemoteType.REMOTE,
        },
      ],
    });

    const service = buildService();
    await expect(service.syncExternalJobs(JOB_SOURCE_ROW.id)).resolves.toEqual({
      upsertedCount: 1,
      skippedInvalid: 1,
      inactivatedCount: 0,
      syncedAt: expect.any(Date),
      durationMs: expect.any(Number),
    });

    expect(prisma.externalJob.upsert).toHaveBeenCalledTimes(1);
  });

  it('records failure health and wraps BadGateway on port error', async () => {
    port.fetchSnapshot.mockRejectedValue(new Error('network down'));

    const service = buildService();

    await expect(
      service.syncExternalJobs(JOB_SOURCE_ROW.id),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.jobSource.update).toHaveBeenCalledWith({
      where: { id: JOB_SOURCE_ROW.id },
      data: expect.objectContaining({
        lastErrorAt: expect.any(Date),
        lastErrorMessage: expect.stringContaining('network down'),
      }),
    });
    expect(prisma.externalJob.upsert).not.toHaveBeenCalled();
    expect(prisma.externalJob.updateMany).not.toHaveBeenCalled();
  });

  it('inactivates jobs missing from the latest snapshot', async () => {
    port.fetchSnapshot.mockResolvedValue({
      rawListings: [
        {
          externalJobId: 'still-open',
          title: 'Engineer',
          company: 'Co',
          applicationUrl: 'https://jobs.example/still-open',
        },
      ],
    });
    prisma.externalJob.updateMany.mockResolvedValueOnce({ count: 3 });

    const service = buildService();
    const result = await service.syncExternalJobs(JOB_SOURCE_ROW.id);

    expect(result.inactivatedCount).toBe(3);
    expect(prisma.externalJob.updateMany).toHaveBeenCalledWith({
      where: {
        sourceId: JOB_SOURCE_ROW.id,
        isActive: true,
        externalJobId: { notIn: ['still-open'] },
      },
      data: { isActive: false },
    });
  });

  it('syncAllActive continues after individual source failures', async () => {
    const sources = [
      { ...JOB_SOURCE_ROW, id: 'src-a', name: 'Alpha' },
      { ...JOB_SOURCE_ROW, id: 'src-b', name: 'Beta' },
    ];

    prisma.jobSource.findMany.mockResolvedValueOnce(sources);
    port.fetchSnapshot
      .mockResolvedValueOnce({
        rawListings: [
          {
            externalJobId: '1',
            title: 'Engineer',
            company: 'Alpha',
            applicationUrl: 'https://jobs.example/1',
          },
        ],
      })
      .mockRejectedValueOnce(new Error('network down'));

    const service = buildService();
    const result = await service.syncAllActiveJobSources();

    expect(result.attempted).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0]?.ok).toBe(true);
    expect(result.results[1]?.ok).toBe(false);
    expect(result.results[1]?.errorMessage).toContain('network down');
  });
});
