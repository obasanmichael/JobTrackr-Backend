import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { JobSourceSubmissionStatus } from '@prisma/client';
import { AuditLogService } from '../admin/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import type { CurrentUser } from '../common/types/current-user.type';
import { AdminJobSourceSubmissionsController } from './admin-job-source-submissions.controller';
import { JobSourceSubmissionsService } from './job-source-submissions.service';

describe('AdminJobSourceSubmissionsController', () => {
  let controller: AdminJobSourceSubmissionsController;
  let service: {
    listForAdmin: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    markSpam: jest.Mock;
  };
  let auditLog: { record: jest.Mock };

  const actor: CurrentUser = {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@example.com',
  };
  const mockReq = { ip: '127.0.0.1', headers: {} } as Request;

  beforeEach(async () => {
    service = {
      listForAdmin: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      markSpam: jest.fn(),
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobSourceSubmissionsController],
      providers: [
        { provide: JobSourceSubmissionsService, useValue: service },
        { provide: AuditLogService, useValue: auditLog },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminJobSourceSubmissionsController);
  });

  it('lists pending submissions by default', async () => {
    service.listForAdmin.mockResolvedValueOnce([]);

    await controller.list({});

    expect(service.listForAdmin).toHaveBeenCalledWith(
      JobSourceSubmissionStatus.PENDING,
    );
  });

  it('approves a submission', async () => {
    service.approve.mockResolvedValueOnce({
      submission: {
        id: 'sub-1',
        jobSourceId: 'js-1',
      },
      jobSource: { id: 'js-1', name: 'Acme', type: 'GREENHOUSE' },
      sync: null,
    });

    const result = await controller.approve(actor, 'sub-1', {}, mockReq);

    expect(service.approve).toHaveBeenCalledWith('sub-1', {});
    expect(result.submission.id).toBe('sub-1');
    expect(auditLog.record).toHaveBeenCalled();
  });

  it('requires auth via guards in production wiring', async () => {
    const adminGuard = new AdminGuard(
      { get: () => '' } as never,
      {
        adminMembership: { findUnique: jest.fn() },
      } as never,
    );
    await expect(
      adminGuard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
      } as never),
    ).rejects.toThrow(UnauthorizedException);
  });
});
