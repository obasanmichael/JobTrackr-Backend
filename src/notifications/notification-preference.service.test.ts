import { NotificationPreferenceService } from './notification-preference.service';
import {
  DEFAULT_NOTIFICATION_CATEGORIES,
  mergeCategories,
  normalizeCategories,
} from './notification-preference.types';

describe('notification-preference.types', () => {
  it('merges partial category updates', () => {
    const next = mergeCategories(DEFAULT_NOTIFICATION_CATEGORIES, {
      reminders: { enabled: false },
    });

    expect(next.reminders.enabled).toBe(false);
    expect(next.matches.enabled).toBe(false);
  });
});

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let prisma: {
    notificationPreference: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    matchAlertPreference: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      notificationPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      matchAlertPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new NotificationPreferenceService(prisma as never);
  });

  it('returns defaults when no rows exist', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    prisma.matchAlertPreference.findUnique.mockResolvedValue(null);

    const result = await service.getOrDescribeDefaults({
      userId: 'user-1',
      email: 'test@example.com',
    });

    expect(result.categories.matches.enabled).toBe(false);
    expect(result.categories.reminders.enabled).toBe(true);
  });

  it('upserts unified preferences and syncs legacy match table', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    prisma.matchAlertPreference.findUnique.mockResolvedValue(null);
    prisma.notificationPreference.upsert.mockResolvedValue({
      categories: normalizeCategories({
        ...DEFAULT_NOTIFICATION_CATEGORIES,
        reminders: { enabled: false },
      }),
      updatedAt: new Date(),
    });

    await service.upsert(
      { userId: 'user-1', email: 'test@example.com' },
      { categories: { reminders: { enabled: false } } },
    );

    expect(prisma.notificationPreference.upsert).toHaveBeenCalled();
    expect(prisma.matchAlertPreference.upsert).toHaveBeenCalled();
  });
});
