import { NotFoundException } from '@nestjs/common';
import { ApplicationEventsService } from './application-events.service';

describe('ApplicationEventsService', () => {
  let service: ApplicationEventsService;
  let prismaService: {
    jobApplication: {
      findFirst: jest.Mock;
    };
    applicationEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      jobApplication: {
        findFirst: jest.fn(),
      },
      applicationEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new ApplicationEventsService(prismaService as never);
  });

  it('creates manual event for owned application', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue({ id: 'app-1' });
    prismaService.applicationEvent.create.mockResolvedValue({
      id: 'event-1',
      userId: 'user-1',
      applicationId: 'app-1',
      type: 'NOTE',
      title: 'Recruiter replied',
      description: 'Follow up next week.',
      createdAt: new Date(),
    });

    const event = await service.createForApplication(
      { userId: 'user-1', email: 'user@example.com' },
      'app-1',
      {
        type: 'NOTE',
        title: 'Recruiter replied',
        description: 'Follow up next week.',
      },
    );

    expect(event.id).toBe('event-1');
    expect(prismaService.applicationEvent.create).toHaveBeenCalled();
  });

  it('throws not found when listing events for non-owned application', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue(null);

    await expect(
      service.listForApplication(
        { userId: 'user-2', email: 'user2@example.com' },
        'app-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws not found when deleting non-owned event', async () => {
    prismaService.applicationEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.removeById(
        { userId: 'user-2', email: 'user2@example.com' },
        'event-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
