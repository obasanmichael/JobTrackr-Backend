import type { MatchAlertPreference } from '@prisma/client';
import type { NotificationPreferenceService } from '../notifications/notification-preference.service';
import { DEFAULT_NOTIFICATION_CATEGORIES } from '../notifications/notification-preference.types';
import type { PrismaService } from '../prisma/prisma.service';
import { MatchAlertPreferenceService } from './match-alert-preference.service';

describe('MatchAlertPreferenceService', () => {
  const user = { userId: 'user-1', email: 'a@example.com' };

  it('returns defaults when no row exists', async () => {
    const notificationPreferences = {
      getOrDescribeDefaults: jest.fn().mockResolvedValue({
        categories: DEFAULT_NOTIFICATION_CATEGORIES,
      }),
    } as unknown as NotificationPreferenceService;
    const prisma = {
      matchAlertPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new MatchAlertPreferenceService(
      prisma,
      notificationPreferences,
    );
    const res = await service.getOrDescribeDefaults(user);
    expect(res.enabled).toBe(false);
    expect(res.minMatchScore).toBe(70);
    expect(res.channels?.email).toBe(true);
    expect(res.updatedAt).toBeUndefined();
  });

  it('upserts preferences via unified notification service', async () => {
    const row = {
      enabled: true,
      minMatchScore: 80,
      channels: { email: true, push: false, inApp: true },
      lastNotifiedAt: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as MatchAlertPreference;
    const notificationPreferences = {
      getOrDescribeDefaults: jest.fn().mockResolvedValue({
        categories: DEFAULT_NOTIFICATION_CATEGORIES,
      }),
      upsert: jest.fn().mockResolvedValue({
        categories: {
          ...DEFAULT_NOTIFICATION_CATEGORIES,
          matches: {
            enabled: true,
            minMatchScore: 80,
            channels: { email: true, push: false, inApp: true },
          },
        },
        updatedAt: row.updatedAt,
      }),
    } as unknown as NotificationPreferenceService;
    const prisma = {
      matchAlertPreference: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(row),
      },
    } as unknown as PrismaService;
    const service = new MatchAlertPreferenceService(
      prisma,
      notificationPreferences,
    );
    const res = await service.upsert(user, {
      enabled: true,
      minMatchScore: 80,
    });
    expect(res.enabled).toBe(true);
    expect(res.minMatchScore).toBe(80);
    expect(notificationPreferences.upsert).toHaveBeenCalled();
  });
});
