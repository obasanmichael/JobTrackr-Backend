import type { MatchAlertPreference } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { MatchAlertPreferenceService } from './match-alert-preference.service';

describe('MatchAlertPreferenceService', () => {
  const user = { userId: 'user-1', email: 'a@example.com' };

  it('returns defaults when no row exists', async () => {
    const prisma = {
      matchAlertPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new MatchAlertPreferenceService(prisma);
    const res = await service.getOrDescribeDefaults(user);
    expect(res.enabled).toBe(false);
    expect(res.minMatchScore).toBe(70);
    expect(res.channels).toBeNull();
    expect(res.updatedAt).toBeUndefined();
  });

  it('upserts preferences', async () => {
    const row = {
      enabled: true,
      minMatchScore: 80,
      channels: { email: true },
      lastNotifiedAt: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as MatchAlertPreference;
    const prisma = {
      matchAlertPreference: {
        upsert: jest.fn().mockResolvedValue(row),
      },
    } as unknown as PrismaService;
    const service = new MatchAlertPreferenceService(prisma);
    const res = await service.upsert(user, { enabled: true, minMatchScore: 80 });
    expect(res.enabled).toBe(true);
    expect(res.minMatchScore).toBe(80);
    expect(prisma.matchAlertPreference.upsert).toHaveBeenCalled();
  });
});
