import { CalendarProvider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { EntitlementsService } from '../billing/entitlements.service';
import { OAuthStateService } from '../crypto/oauth-state.service';
import { TokenEncryptionService } from '../crypto/token-encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { GoogleCalendarClient } from './google-calendar.client';

describe('CalendarIntegrationsService', () => {
  const key = Buffer.alloc(32, 9).toString('base64');

  function createService(overrides?: {
    googleConfigured?: boolean;
    frontendUrl?: string;
  }) {
    const prisma = {
      calendarIntegration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const config = {
      get: (name: string) => {
        if (name === 'ENCRYPTION_KEY') return key;
        if (name === 'FRONTEND_URL') {
          return overrides?.frontendUrl ?? 'http://localhost:3001';
        }
        if (name === 'GOOGLE_CLIENT_ID') {
          return overrides?.googleConfigured === false
            ? undefined
            : 'client-id';
        }
        if (name === 'GOOGLE_CLIENT_SECRET') {
          return overrides?.googleConfigured === false
            ? undefined
            : 'client-secret';
        }
        if (name === 'GOOGLE_CALENDAR_REDIRECT_URI') {
          return overrides?.googleConfigured === false
            ? undefined
            : 'http://localhost:4000/api/v1/calendar/google/callback';
        }
        return undefined;
      },
    } as ConfigService;

    const entitlements = {
      assertFeatureEnabled: jest.fn(),
    } as unknown as EntitlementsService;

    const buildAuthorizationUrl = jest
      .fn()
      .mockReturnValue('https://google.test/auth');
    const googleCalendar = {
      buildAuthorizationUrl,
      exchangeCodeForTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as GoogleCalendarClient;

    const service = new CalendarIntegrationsService(
      prisma as unknown as PrismaService,
      config,
      entitlements,
      new TokenEncryptionService(config),
      new OAuthStateService(config),
      googleCalendar,
    );

    return {
      service,
      prisma,
      googleCalendar,
      entitlements,
      buildAuthorizationUrl,
    };
  }

  it('returns disconnected status when no integration exists', async () => {
    const { service, prisma } = createService();
    prisma.calendarIntegration.findUnique.mockResolvedValue(null);

    const status = await service.getStatus({
      userId: 'u1',
      email: 'a@b.com',
    });

    expect(status.connected).toBe(false);
    expect(status.provider).toBeNull();
  });

  it('builds connect URL when Google is configured', async () => {
    const { service, buildAuthorizationUrl } = createService();

    const result = await service.getConnectUrl({
      userId: 'u1',
      email: 'a@b.com',
    });

    expect(result.authorizationUrl).toContain('https://google.test/auth');
    expect(buildAuthorizationUrl).toHaveBeenCalled();
  });

  it('maps active integration to status DTO', async () => {
    const { service, prisma } = createService();
    prisma.calendarIntegration.findUnique.mockResolvedValue({
      id: 'i1',
      userId: 'u1',
      provider: CalendarProvider.GOOGLE,
      providerAccountEmail: 'user@gmail.com',
      accessTokenEncrypted: 'enc',
      refreshTokenEncrypted: 'enc',
      scope: 'calendar.events',
      expiresAt: new Date(),
      isActive: true,
      autoSyncInterviews: true,
      lastSyncAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const status = await service.getStatus({
      userId: 'u1',
      email: 'a@b.com',
    });

    expect(status.connected).toBe(true);
    expect(status.providerAccountEmail).toBe('user@gmail.com');
  });
});
