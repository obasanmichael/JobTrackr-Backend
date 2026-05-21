import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobSourceSubmissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
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

  beforeEach(async () => {
    service = {
      listForAdmin: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      markSpam: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobSourceSubmissionsController],
      providers: [{ provide: JobSourceSubmissionsService, useValue: service }],
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
    service.approve.mockResolvedValueOnce({ submission: { id: 'sub-1' } });

    const result = await controller.approve('sub-1', {});

    expect(service.approve).toHaveBeenCalledWith('sub-1', {});
    expect(result).toEqual({ submission: { id: 'sub-1' } });
  });

  it('requires auth via guards in production wiring', async () => {
    const adminGuard = new AdminGuard({ get: () => '' } as never, {
      adminMembership: { findUnique: jest.fn() },
    } as never);
    await expect(
      adminGuard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
      } as never),
    ).rejects.toThrow(UnauthorizedException);
  });
});
