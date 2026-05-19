import { NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from './dto/application.enums';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prismaService: {
    applicationEvent: {
      create: jest.Mock;
    };
    jobApplication: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      applicationEvent: {
        create: jest.fn(),
      },
      jobApplication: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new ApplicationsService(prismaService as never);
  });

  it('creates application with authenticated userId ownership', async () => {
    prismaService.jobApplication.create.mockResolvedValue({
      id: 'app-1',
      userId: 'user-1',
      jobTitle: 'Frontend Engineer',
      companyName: 'Acme',
      jobUrl: null,
      location: null,
      workMode: 'UNSPECIFIED',
      salaryMin: null,
      salaryMax: null,
      currency: 'USD',
      status: 'SAVED',
      source: 'OTHER',
      deadline: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(
      { userId: 'user-1', email: 'user@example.com' },
      {
        jobTitle: 'Frontend Engineer',
        companyName: 'Acme',
      },
    );

    expect(prismaService.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          jobTitle: 'Frontend Engineer',
        }),
      }),
    );
  });

  it('filters and sorts list queries predictably', async () => {
    prismaService.jobApplication.findMany.mockResolvedValue([]);

    await service.findAll(
      { userId: 'user-1', email: 'user@example.com' },
      { status: ApplicationStatus.APPLIED, search: 'acme', sort: 'deadline' },
    );

    expect(prismaService.jobApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          status: ApplicationStatus.APPLIED,
        }),
        orderBy: [
          { deadline: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),
    );
  });

  it('throws not found when fetching non-owned application', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(
        { userId: 'user-2', email: 'user2@example.com' },
        'app-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws not found when deleting non-owned application', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue(null);

    await expect(
      service.remove({ userId: 'user-2', email: 'user2@example.com' }, 'app-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates STATUS_CHANGE event when status changes', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'SAVED',
    });
    prismaService.jobApplication.update.mockResolvedValue({
      id: 'app-1',
      userId: 'user-1',
      jobTitle: 'Frontend Engineer',
      companyName: 'Acme',
      jobUrl: null,
      location: null,
      workMode: 'UNSPECIFIED',
      salaryMin: null,
      salaryMax: null,
      currency: 'USD',
      status: 'APPLIED',
      source: 'OTHER',
      deadline: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.update(
      { userId: 'user-1', email: 'user@example.com' },
      'app-1',
      { status: ApplicationStatus.APPLIED },
    );

    expect(prismaService.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'STATUS_CHANGE',
          title: 'Status changed from Saved to Applied',
        }),
      }),
    );
  });

  it('does not create STATUS_CHANGE event when status is unchanged', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'APPLIED',
    });
    prismaService.jobApplication.update.mockResolvedValue({
      id: 'app-1',
      userId: 'user-1',
      jobTitle: 'Frontend Engineer',
      companyName: 'Acme',
      jobUrl: null,
      location: null,
      workMode: 'UNSPECIFIED',
      salaryMin: null,
      salaryMax: null,
      currency: 'USD',
      status: 'APPLIED',
      source: 'OTHER',
      deadline: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.update(
      { userId: 'user-1', email: 'user@example.com' },
      'app-1',
      { status: ApplicationStatus.APPLIED },
    );

    expect(prismaService.applicationEvent.create).not.toHaveBeenCalled();
  });
});
