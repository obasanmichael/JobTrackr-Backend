import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AuditLogService } from '../admin/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import type { CurrentUser } from '../common/types/current-user.type';
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
  let auditLog: { record: jest.Mock };

  const actor: CurrentUser = {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@example.com',
  };
  const mockReq = { ip: '127.0.0.1', headers: {} } as Request;

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
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobSourcesController],
      providers: [
        { provide: JobSourcesService, useValue: jobSourcesService },
        {
          provide: JobIngestOrchestrationService,
          useValue: jobIngestOrchestrationService,
        },
        { provide: AuditLogService, useValue: auditLog },
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

      const result = await controller.sync(actor, jobSourceId, mockReq);

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
      expect(auditLog.record).toHaveBeenCalled();
    });

    it('propagates NotFoundException from orchestration', async () => {
      jobIngestOrchestrationService.syncExternalJobs.mockRejectedValueOnce(
        new NotFoundException('Job source not found'),
      );

      await expect(
        controller.sync(actor, jobSourceId, mockReq),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException when ingest fails', async () => {
      jobIngestOrchestrationService.syncExternalJobs.mockRejectedValueOnce(
        new BadGatewayException('network down'),
      );

      await expect(
        controller.sync(actor, jobSourceId, mockReq),
      ).rejects.toBeInstanceOf(BadGatewayException);
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

      const result = await controller.syncActive(actor, mockReq);

      expect(
        jobIngestOrchestrationService.syncAllActiveJobSources,
      ).toHaveBeenCalled();
      expect(result.attempted).toBe(2);
      expect(result.failed).toBe(1);
      expect(auditLog.record).toHaveBeenCalled();
    });
  });
});
