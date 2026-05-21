import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AuditLogService } from '../admin/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import type { CurrentUser } from '../common/types/current-user.type';
import { AdminJobQualityController } from './admin-job-quality.controller';
import { ExternalJobQualityService } from './external-job-quality.service';

describe('AdminJobQualityController', () => {
  let controller: AdminJobQualityController;
  let externalJobQualityService: {
    runQualityScan: jest.Mock;
    purgeInactiveExternalJobs: jest.Mock;
    assertPurgeEnabledOrDryRun: jest.Mock;
  };
  let auditLog: { record: jest.Mock };

  const actor: CurrentUser = {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@example.com',
  };
  const mockReq = { ip: '127.0.0.1', headers: {} } as Request;

  beforeEach(async () => {
    externalJobQualityService = {
      runQualityScan: jest.fn(),
      purgeInactiveExternalJobs: jest.fn(),
      assertPurgeEnabledOrDryRun: jest.fn(),
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobQualityController],
      providers: [
        {
          provide: ExternalJobQualityService,
          useValue: externalJobQualityService,
        },
        { provide: AuditLogService, useValue: auditLog },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminJobQualityController);
  });

  it('returns scan summary', async () => {
    externalJobQualityService.runQualityScan.mockResolvedValueOnce({
      scannedCount: 10,
      suspiciousCount: 2,
      clearedCount: 8,
      flaggedByReason: { MISSING_APPLICATION_URL: 2 },
      durationMs: 100,
    });

    const result = await controller.scan(actor, mockReq);

    expect(result.scannedCount).toBe(10);
    expect(externalJobQualityService.runQualityScan).toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalled();
  });

  it('passes dryRun to purge service', async () => {
    externalJobQualityService.purgeInactiveExternalJobs.mockResolvedValueOnce({
      dryRun: true,
      enabled: true,
      retentionDays: 90,
      cutoff: '2026-02-18T00:00:00.000Z',
      matchedCount: 3,
      deletedCount: 0,
      durationMs: 50,
    });

    const result = await controller.purgeInactive(actor, 'true', mockReq);

    expect(
      externalJobQualityService.assertPurgeEnabledOrDryRun,
    ).toHaveBeenCalledWith(true);
    expect(
      externalJobQualityService.purgeInactiveExternalJobs,
    ).toHaveBeenCalledWith({
      dryRun: true,
    });
    expect(result.matchedCount).toBe(3);
    expect(auditLog.record).toHaveBeenCalled();
  });

  it('propagates purge guard errors', async () => {
    externalJobQualityService.assertPurgeEnabledOrDryRun.mockImplementation(
      () => {
        throw new BadRequestException('disabled');
      },
    );

    await expect(async () => {
      await controller.purgeInactive(actor, undefined, mockReq);
    }).rejects.toBeInstanceOf(BadRequestException);
  });
});
