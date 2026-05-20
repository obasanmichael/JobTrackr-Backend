import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminJobSourcesController } from './admin-job-sources.controller';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import { JobSourcesService } from './job-sources.service';

describe('AdminJobSourcesController', () => {
  let controller: AdminJobSourcesController;
  let jobSourcesService: {
    listForAdmin: jest.Mock;
    createForAdmin: jest.Mock;
    updateForAdmin: jest.Mock;
  };
  let jobIngestOrchestrationService: {
    syncExternalJobs: jest.Mock;
    syncAllActiveJobSources: jest.Mock;
  };

  const jobSourceId = '11111111-1111-1111-8111-111111111111';

  beforeEach(async () => {
    jobSourcesService = {
      listForAdmin: jest.fn(),
      createForAdmin: jest.fn(),
      updateForAdmin: jest.fn(),
    };
    jobIngestOrchestrationService = {
      syncExternalJobs: jest.fn(),
      syncAllActiveJobSources: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobSourcesController],
      providers: [
        { provide: JobSourcesService, useValue: jobSourcesService },
        {
          provide: JobIngestOrchestrationService,
          useValue: jobIngestOrchestrationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminJobSourcesController);
  });

  describe('sync', () => {
    it('returns sync counts for a valid job source id', async () => {
      const syncedAt = new Date('2026-05-19T12:00:00.000Z');
      jobIngestOrchestrationService.syncExternalJobs.mockResolvedValueOnce({
        upsertedCount: 12,
        skippedInvalid: 1,
        inactivatedCount: 4,
        syncedAt,
        durationMs: 1500,
      });

      const result = await controller.sync(jobSourceId);

      expect(
        jobIngestOrchestrationService.syncExternalJobs,
      ).toHaveBeenCalledWith(jobSourceId);
      expect(result).toEqual({
        jobSourceId,
        upsertedCount: 12,
        skippedInvalid: 1,
        inactivatedCount: 4,
        durationMs: 1500,
        syncedAt,
      });
    });

    it('propagates NotFoundException from orchestration', async () => {
      jobIngestOrchestrationService.syncExternalJobs.mockRejectedValueOnce(
        new NotFoundException('Job source not found'),
      );

      await expect(controller.sync(jobSourceId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('propagates BadGatewayException when ingest fails', async () => {
      jobIngestOrchestrationService.syncExternalJobs.mockRejectedValueOnce(
        new BadGatewayException('network down'),
      );

      await expect(controller.sync(jobSourceId)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  describe('syncActive', () => {
    it('returns bulk sync summary from orchestration', async () => {
      jobIngestOrchestrationService.syncAllActiveJobSources = jest
        .fn()
        .mockResolvedValueOnce({
          attempted: 2,
          succeeded: 1,
          failed: 1,
          results: [
            {
              jobSourceId: 'a',
              name: 'A',
              ok: true,
              upsertedCount: 3,
              skippedInvalid: 0,
              syncedAt: new Date('2026-05-19T12:00:00.000Z'),
            },
            {
              jobSourceId: 'b',
              name: 'B',
              ok: false,
              errorMessage: 'network down',
            },
          ],
        });

      const result = await controller.syncActive();

      expect(
        jobIngestOrchestrationService.syncAllActiveJobSources,
      ).toHaveBeenCalled();
      expect(result.attempted).toBe(2);
      expect(result.failed).toBe(1);
    });
  });
});
