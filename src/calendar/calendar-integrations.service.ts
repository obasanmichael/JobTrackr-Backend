import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CalendarEventSourceType,
  CalendarEventSyncStatus,
  CalendarProvider,
  InterviewStage,
  InterviewType,
  type CalendarIntegration,
} from '@prisma/client';
import { FEATURE_CALENDAR_SYNC } from '../billing/billing.constants';
import { EntitlementsService } from '../billing/entitlements.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { OAuthStateService } from '../crypto/oauth-state.service';
import { TokenEncryptionService } from '../crypto/token-encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalendarConnectResponseDto,
  CalendarStatusResponseDto,
  PatchCalendarSettingsDto,
} from './dto/calendar.dto';
import {
  getGoogleCalendarConfig,
  GOOGLE_CALENDAR_OAUTH_PURPOSE,
} from './google-calendar.config';
import { GoogleCalendarClient } from './google-calendar.client';

@Injectable()
export class CalendarIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly tokenEncryption: TokenEncryptionService,
    private readonly oauthState: OAuthStateService,
    private readonly googleCalendar: GoogleCalendarClient,
  ) {}

  async getConnectUrl(user: CurrentUser): Promise<CalendarConnectResponseDto> {
    await this.entitlements.assertFeatureEnabled(
      user.userId,
      FEATURE_CALENDAR_SYNC,
    );
    this.assertGoogleConfigured();

    const state = this.oauthState.create(
      user.userId,
      GOOGLE_CALENDAR_OAUTH_PURPOSE,
    );
    return {
      authorizationUrl: this.googleCalendar.buildAuthorizationUrl(state),
    };
  }

  async handleGoogleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
  ): Promise<string> {
    const frontendUrl = this.getFrontendRedirectBase();

    if (error) {
      return `${frontendUrl}/dashboard/calendar?error=${encodeURIComponent(error)}`;
    }
    if (!code || !state) {
      return `${frontendUrl}/dashboard/calendar?error=${encodeURIComponent('Missing OAuth code or state.')}`;
    }

    try {
      const payload = this.oauthState.verify(
        state,
        GOOGLE_CALENDAR_OAUTH_PURPOSE,
      );
      await this.entitlements.assertFeatureEnabled(
        payload.userId,
        FEATURE_CALENDAR_SYNC,
      );

      const tokens = await this.googleCalendar.exchangeCodeForTokens(code);
      const accessTokenEncrypted = tokens.accessToken
        ? this.tokenEncryption.encrypt(tokens.accessToken)
        : null;
      const refreshTokenEncrypted = this.tokenEncryption.encrypt(
        tokens.refreshToken,
      );

      await this.prisma.calendarIntegration.upsert({
        where: {
          userId_provider: {
            userId: payload.userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
        create: {
          userId: payload.userId,
          provider: CalendarProvider.GOOGLE,
          providerAccountEmail: tokens.email,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          scope: tokens.scope,
          expiresAt: tokens.expiresAt,
          isActive: true,
          lastError: null,
        },
        update: {
          providerAccountEmail: tokens.email,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          scope: tokens.scope,
          expiresAt: tokens.expiresAt,
          isActive: true,
          lastError: null,
        },
      });

      return `${frontendUrl}/dashboard/calendar?connected=1`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Calendar connection failed.';
      return `${frontendUrl}/dashboard/calendar?error=${encodeURIComponent(message)}`;
    }
  }

  async getStatus(user: CurrentUser): Promise<CalendarStatusResponseDto> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: {
        userId_provider: {
          userId: user.userId,
          provider: CalendarProvider.GOOGLE,
        },
      },
    });

    if (!integration || !integration.isActive) {
      return {
        provider: null,
        connected: false,
        providerAccountEmail: null,
        lastSyncAt: null,
        lastError: null,
        autoSyncInterviews: true,
      };
    }

    return this.toStatus(integration);
  }

  async updateSettings(
    user: CurrentUser,
    dto: PatchCalendarSettingsDto,
  ): Promise<CalendarStatusResponseDto> {
    await this.entitlements.assertFeatureEnabled(
      user.userId,
      FEATURE_CALENDAR_SYNC,
    );

    const integration = await this.getActiveIntegrationOrThrow(user.userId);
    const updated = await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        autoSyncInterviews:
          dto.autoSyncInterviews ?? integration.autoSyncInterviews,
      },
    });
    return this.toStatus(updated);
  }

  async disconnect(user: CurrentUser): Promise<CalendarStatusResponseDto> {
    await this.entitlements.assertFeatureEnabled(
      user.userId,
      FEATURE_CALENDAR_SYNC,
    );

    const integration = await this.prisma.calendarIntegration.findUnique({
      where: {
        userId_provider: {
          userId: user.userId,
          provider: CalendarProvider.GOOGLE,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException('Calendar integration not found.');
    }

    if (integration.isActive) {
      try {
        const refreshToken = this.tokenEncryption.decrypt(
          integration.refreshTokenEncrypted,
        );
        await this.googleCalendar.revokeRefreshToken(refreshToken);
      } catch {
        // Best-effort revoke; still deactivate locally.
      }
    }

    const updated = await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        isActive: false,
        accessTokenEncrypted: null,
        expiresAt: null,
        lastError: null,
      },
    });

    return this.toStatus(updated);
  }

  async getActiveIntegrationOrThrow(
    userId: string,
  ): Promise<CalendarIntegration> {
    const integration = await this.findActiveIntegration(userId);
    if (!integration) {
      throw new NotFoundException(
        'Google Calendar is not connected for this account.',
      );
    }
    return integration;
  }

  async findActiveIntegration(
    userId: string,
  ): Promise<CalendarIntegration | null> {
    return this.prisma.calendarIntegration.findFirst({
      where: {
        userId,
        provider: CalendarProvider.GOOGLE,
        isActive: true,
      },
    });
  }

  getValidRefreshToken(integration: CalendarIntegration): string {
    return this.tokenEncryption.decrypt(integration.refreshTokenEncrypted);
  }

  async refreshStoredAccessToken(
    integration: CalendarIntegration,
  ): Promise<CalendarIntegration> {
    const refreshToken = this.getValidRefreshToken(integration);
    const refreshed =
      await this.googleCalendar.refreshAccessToken(refreshToken);
    return this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessTokenEncrypted: this.tokenEncryption.encrypt(
          refreshed.accessToken,
        ),
        expiresAt: refreshed.expiresAt,
        lastError: null,
      },
    });
  }

  async recordSyncSuccess(integrationId: string): Promise<void> {
    await this.prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    });
  }

  async recordSyncFailure(
    integrationId: string,
    message: string,
  ): Promise<void> {
    await this.prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        lastError: message.slice(0, 500),
      },
    });
  }

  buildInterviewEventTitle(companyName: string, stage: InterviewStage): string {
    const stageLabel = stage.replace(/_/g, ' ').toLowerCase();
    return `${companyName} — ${stageLabel} interview`;
  }

  buildInterviewEventDescription(input: {
    jobTitle: string;
    companyName: string;
    interviewType: InterviewType;
    notes: string | null;
    meetingLink: string | null;
  }): string {
    const lines = [
      `Role: ${input.jobTitle}`,
      `Company: ${input.companyName}`,
      `Type: ${input.interviewType.replace(/_/g, ' ').toLowerCase()}`,
    ];
    if (input.meetingLink) {
      lines.push(`Meeting link: ${input.meetingLink}`);
    }
    if (input.notes?.trim()) {
      lines.push('', input.notes.trim());
    }
    lines.push('', 'Synced from JobTrackr');
    return lines.join('\n');
  }

  private toStatus(
    integration: CalendarIntegration,
  ): CalendarStatusResponseDto {
    return {
      provider: integration.provider,
      connected: integration.isActive,
      providerAccountEmail: integration.providerAccountEmail,
      lastSyncAt: integration.lastSyncAt,
      lastError: integration.lastError,
      autoSyncInterviews: integration.autoSyncInterviews,
    };
  }

  private assertGoogleConfigured(): void {
    if (!getGoogleCalendarConfig(this.configService)) {
      throw new ServiceUnavailableException(
        'Google Calendar integration is not configured on the server.',
      );
    }
  }

  private getFrontendRedirectBase(): string {
    const configured = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    throw new BadRequestException(
      'FRONTEND_URL must be configured for calendar OAuth callbacks.',
    );
  }
}

export { CalendarEventSourceType, CalendarEventSyncStatus };
