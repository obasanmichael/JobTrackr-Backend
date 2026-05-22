import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const user = { userId: 'u1', email: 'a@b.com' };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('creates notification', async () => {
    prisma.notification.create.mockResolvedValue({
      id: 'n1',
      userId: user.userId,
      type: NotificationType.GENERAL,
      title: 'Hello',
      message: 'World',
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    });

    const result = await service.create({
      userId: user.userId,
      type: NotificationType.GENERAL,
      title: 'Hello',
      message: 'World',
    });

    expect(result.id).toBe('n1');
  });

  it('marks notification read for owner', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'n1',
      userId: user.userId,
      type: NotificationType.GENERAL,
      title: 'Hello',
      message: 'World',
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    });
    prisma.notification.update.mockResolvedValue({
      id: 'n1',
      userId: user.userId,
      type: NotificationType.GENERAL,
      title: 'Hello',
      message: 'World',
      metadata: null,
      readAt: new Date(),
      createdAt: new Date(),
    });

    const result = await service.markRead(user, 'n1');
    expect(result.readAt).toBeTruthy();
  });
});
