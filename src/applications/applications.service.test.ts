import { NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from './dto/application.enums';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prismaService: {
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
      service.findOne({ userId: 'user-2', email: 'user2@example.com' }, 'app-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws not found when deleting non-owned application', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue(null);

    await expect(
      service.remove({ userId: 'user-2', email: 'user2@example.com' }, 'app-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
