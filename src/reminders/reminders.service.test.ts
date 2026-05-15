import { NotFoundException } from '@nestjs/common';
import { RemindersService } from './reminders.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let prismaService: {
    reminder: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    jobApplication: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      reminder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jobApplication: {
        findFirst: jest.fn(),
      },
    };

    service = new RemindersService(prismaService as never);
  });

  it('creates reminder only when application is owned by user', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue({ id: 'app-1' });
    prismaService.reminder.create.mockResolvedValue({
      id: 'rem-1',
      userId: 'user-1',
      applicationId: 'app-1',
      title: 'Follow up',
      description: null,
      dueDate: new Date(),
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(
      { userId: 'user-1', email: 'user@example.com' },
      {
        applicationId: 'app-1',
        title: 'Follow up',
        dueDate: new Date(),
      },
    );

    expect(prismaService.jobApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'app-1', userId: 'user-1' }),
      }),
    );
    expect(prismaService.reminder.create).toHaveBeenCalled();
  });

  it('throws not found for cross-user reminder access', async () => {
    prismaService.reminder.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        { userId: 'user-2', email: 'user2@example.com' },
        'rem-1',
        { title: 'Updated' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds upcoming query with deterministic ordering', async () => {
    prismaService.reminder.findMany.mockResolvedValue([]);

    await service.findUpcoming({ userId: 'user-1', email: 'user@example.com' });

    expect(prismaService.reminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isCompleted: false,
          dueDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
