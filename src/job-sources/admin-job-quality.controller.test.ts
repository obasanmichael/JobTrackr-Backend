import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminJobQualityController } from './admin-job-quality.controller';
import { ExternalJobQualityService } from './external-job-quality.service';

describe('AdminJobQualityController', () => {
  let controller: AdminJobQualityController;
  let externalJobQualityService: {
    runQualityScan: jest.Mock;
    purgeInactiveExternalJobs: jest.Mock;
    assertPurgeEnabledOrDryRun: jest.Mock;
  };

  beforeEach(async () => {
    externalJobQualityService = {
      runQualityScan: jest.fn(),
      purgeInactiveExternalJobs: jest.fn(),
      assertPurgeEnabledOrDryRun: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobQualityController],
      providers: [
        {
          provide: ExternalJobQualityService,
          useValue: externalJobQualityService,
        },
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

    const result = await controller.scan();

    expect(result.scannedCount).toBe(10);
    expect(externalJobQualityService.runQualityScan).toHaveBeenCalled();
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

    const result = await controller.purgeInactive('true');

    expect(
      externalJobQualityService.assertPurgeEnabledOrDryRun,
    ).toHaveBeenCalledWith(true);
    expect(
      externalJobQualityService.purgeInactiveExternalJobs,
    ).toHaveBeenCalledWith({
      dryRun: true,
    });
    expect(result.matchedCount).toBe(3);
  });

  it('propagates purge guard errors', async () => {
    externalJobQualityService.assertPurgeEnabledOrDryRun.mockImplementation(
      () => {
        throw new BadRequestException('disabled');
      },
    );

    await expect(async () => {
      await controller.purgeInactive(undefined);
    }).rejects.toBeInstanceOf(BadRequestException);
  });
});
