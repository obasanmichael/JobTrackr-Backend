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
    jobSource: { findUnique: jest.Mock; update: jest.Mock };
    externalJob: { upsert: jest.Mock };
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
      },
      externalJob: {
        upsert: jest.fn().mockResolvedValue({}),
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
    });

    expect(prisma.externalJob.upsert).not.toHaveBeenCalled();
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

    expect(result).toEqual({ upsertedCount: 2, skippedInvalid: 0 });
    expect(prisma.externalJob.upsert).toHaveBeenCalledTimes(2);
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
  });
});
