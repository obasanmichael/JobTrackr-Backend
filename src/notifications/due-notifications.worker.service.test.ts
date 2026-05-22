import { DueNotificationsWorkerService } from './due-notifications.worker.service';

describe('DueNotificationsWorkerService', () => {
  it('sends in-app reminder notification within lead window', async () => {
    const dueDate = new Date(Date.now() + 60 * 60 * 1000);
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'user-1', email: 'user@example.com', name: 'User' },
        ]),
      },
      reminder: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rem-1',
            title: 'Follow up',
            description: null,
            applicationId: 'app-1',
            dueDate,
          },
        ]),
      },
      interview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notificationDeliveryLog: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'NOTIFICATION_WORKER_ENABLED' ? 'true' : undefined,
      ),
    };

    const notificationPreferences = {
      getCategoriesForUser: jest.fn().mockResolvedValue({
        matches: {
          enabled: false,
          minMatchScore: 70,
          channels: { email: false, push: false, inApp: true },
        },
        reminders: {
          enabled: true,
          leadMinutes: [60],
          channels: { email: false, push: false, inApp: true },
        },
        interviews: {
          enabled: false,
          leadMinutes: [60],
          channels: { email: false, push: false, inApp: true },
        },
      }),
    };

    const notifications = {
      create: jest.fn().mockResolvedValue({}),
    };

    const emailService = {
      sendNotificationEmail: jest.fn(),
    };

    const worker = new DueNotificationsWorkerService(
      prisma as never,
      configService as never,
      notificationPreferences as never,
      notifications as never,
      emailService as never,
    );

    const result = await worker.runDueChecks(new Date());

    expect(result.enabled).toBe(true);
    expect(result.remindersSent).toBe(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REMINDER_DUE',
        userId: 'user-1',
      }),
    );
  });

  it('skips when worker is disabled', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    };
    const worker = new DueNotificationsWorkerService(
      { user: { findMany: jest.fn() } } as never,
      configService as never,
      { getCategoriesForUser: jest.fn() } as never,
      { create: jest.fn() } as never,
      { sendNotificationEmail: jest.fn() } as never,
    );

    const result = await worker.runDueChecks(new Date());
    expect(result).toEqual({
      enabled: false,
      remindersSent: 0,
      interviewsSent: 0,
    });
  });
});
