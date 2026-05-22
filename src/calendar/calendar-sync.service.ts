import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CalendarEventSourceType,
  CalendarEventSyncStatus,
  type CalendarIntegration,
  type Interview,
} from '@prisma/client';
import { FEATURE_CALENDAR_SYNC } from '../billing/billing.constants';
import { EntitlementsService } from '../billing/entitlements.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import {
  SyncInterviewsDto,
  SyncInterviewsResponseDto,
} from './dto/calendar.dto';
import { GoogleCalendarClient } from './google-calendar.client';

const INTERVIEW_DURATION_MS = 60 * 60 * 1000;

type InterviewWithApplication = Interview & {
  application: {
    jobTitle: string;
    companyName: string;
  };
};

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly integrations: CalendarIntegrationsService,
    private readonly googleCalendar: GoogleCalendarClient,
  ) {}

  async syncInterviews(
    user: CurrentUser,
    dto: SyncInterviewsDto = {},
  ): Promise<SyncInterviewsResponseDto> {
    await this.entitlements.assertFeatureEnabled(
      user.userId,
      FEATURE_CALENDAR_SYNC,
    );

    const integration = await this.integrations.getActiveIntegrationOrThrow(
      user.userId,
    );
    const refreshToken = this.integrations.getValidRefreshToken(integration);

    const interviews = dto.interviewId
      ? await this.loadInterview(user.userId, dto.interviewId)
      : await this.loadUpcomingInterviews(user.userId);

    const results: SyncInterviewsResponseDto['results'] = [];

    for (const interview of interviews) {
      results.push(
        await this.syncSingleInterview(
          user.userId,
          integration,
          refreshToken,
          interview,
        ),
      );
    }

    const syncedCount = results.filter(
      (row) => row.syncStatus === CalendarEventSyncStatus.SYNCED,
    ).length;
    const failedCount = results.length - syncedCount;

    if (failedCount > 0) {
      await this.integrations.recordSyncFailure(
        integration.id,
        `${failedCount} interview(s) failed to sync.`,
      );
    } else if (results.length > 0) {
      await this.integrations.recordSyncSuccess(integration.id);
    }

    return { results, syncedCount, failedCount };
  }

  /** Fire-and-forget safe: logs failures, never throws to interview CRUD callers. */
  async syncInterviewIfEnabled(
    userId: string,
    interviewId: string,
  ): Promise<void> {
    try {
      const integration = await this.integrations.findActiveIntegration(userId);
      if (!integration?.autoSyncInterviews) {
        return;
      }

      const interview = await this.loadInterviewRecord(userId, interviewId);
      if (!interview) {
        return;
      }

      if (interview.scheduledAt.getTime() < Date.now()) {
        await this.removeInterviewFromCalendar(
          userId,
          integration,
          interviewId,
        );
        return;
      }

      const refreshToken = this.integrations.getValidRefreshToken(integration);
      const result = await this.syncSingleInterview(
        userId,
        integration,
        refreshToken,
        interview,
      );

      if (result.syncStatus === CalendarEventSyncStatus.SYNCED) {
        await this.integrations.recordSyncSuccess(integration.id);
      } else {
        await this.integrations.recordSyncFailure(
          integration.id,
          result.error ?? 'Interview auto-sync failed.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Interview auto-sync failed [userId=${userId}, interviewId=${interviewId}]: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** Removes Google event + mapping when interview is deleted (best-effort). */
  async deleteInterviewFromCalendarIfConnected(
    userId: string,
    interviewId: string,
  ): Promise<void> {
    try {
      const integration = await this.integrations.findActiveIntegration(userId);
      if (!integration) {
        return;
      }
      await this.removeInterviewFromCalendar(userId, integration, interviewId);
    } catch (err) {
      this.logger.warn(
        `Interview calendar cleanup failed [userId=${userId}, interviewId=${interviewId}]: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async syncSingleInterview(
    userId: string,
    integration: CalendarIntegration,
    refreshToken: string,
    interview: InterviewWithApplication,
  ): Promise<SyncInterviewsResponseDto['results'][number]> {
    try {
      const mapping = await this.prisma.calendarEvent.upsert({
        where: {
          integrationId_sourceType_sourceId: {
            integrationId: integration.id,
            sourceType: CalendarEventSourceType.INTERVIEW,
            sourceId: interview.id,
          },
        },
        create: {
          userId,
          integrationId: integration.id,
          sourceType: CalendarEventSourceType.INTERVIEW,
          sourceId: interview.id,
          syncStatus: CalendarEventSyncStatus.PENDING,
        },
        update: {},
      });

      const start = interview.scheduledAt;
      const end = new Date(start.getTime() + INTERVIEW_DURATION_MS);
      const providerEventId = await this.googleCalendar.upsertEvent(
        refreshToken,
        mapping.providerEventId,
        this.buildGoogleEventPayload(interview, start, end),
      );

      await this.prisma.calendarEvent.update({
        where: { id: mapping.id },
        data: {
          providerEventId,
          syncStatus: CalendarEventSyncStatus.SYNCED,
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

      return {
        interviewId: interview.id,
        syncStatus: CalendarEventSyncStatus.SYNCED,
        providerEventId,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Interview sync failed.';
      await this.prisma.calendarEvent.upsert({
        where: {
          integrationId_sourceType_sourceId: {
            integrationId: integration.id,
            sourceType: CalendarEventSourceType.INTERVIEW,
            sourceId: interview.id,
          },
        },
        create: {
          userId,
          integrationId: integration.id,
          sourceType: CalendarEventSourceType.INTERVIEW,
          sourceId: interview.id,
          syncStatus: CalendarEventSyncStatus.FAILED,
          lastError: message.slice(0, 500),
        },
        update: {
          syncStatus: CalendarEventSyncStatus.FAILED,
          lastError: message.slice(0, 500),
        },
      });

      return {
        interviewId: interview.id,
        syncStatus: CalendarEventSyncStatus.FAILED,
        error: message,
      };
    }
  }

  private buildGoogleEventPayload(
    interview: InterviewWithApplication,
    start: Date,
    end: Date,
  ) {
    return {
      summary: this.integrations.buildInterviewEventTitle(
        interview.application.companyName,
        interview.stage,
      ),
      description: this.integrations.buildInterviewEventDescription({
        jobTitle: interview.application.jobTitle,
        companyName: interview.application.companyName,
        interviewType: interview.interviewType,
        notes: interview.notes,
        meetingLink: interview.meetingLink,
      }),
      location: interview.location ?? undefined,
      start,
      end,
      conferenceLink: interview.meetingLink ?? undefined,
    };
  }

  private async removeInterviewFromCalendar(
    userId: string,
    integration: CalendarIntegration,
    interviewId: string,
  ): Promise<void> {
    const mapping = await this.prisma.calendarEvent.findUnique({
      where: {
        integrationId_sourceType_sourceId: {
          integrationId: integration.id,
          sourceType: CalendarEventSourceType.INTERVIEW,
          sourceId: interviewId,
        },
      },
    });

    if (!mapping) {
      return;
    }

    if (mapping.providerEventId) {
      const refreshToken = this.integrations.getValidRefreshToken(integration);
      try {
        await this.googleCalendar.deleteEvent(
          refreshToken,
          mapping.providerEventId,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Google event delete failed.';
        this.logger.warn(
          `Could not delete Google event [interviewId=${interviewId}]: ${message}`,
        );
      }
    }

    if (mapping.userId !== userId) {
      return;
    }

    await this.prisma.calendarEvent.delete({ where: { id: mapping.id } });
  }

  private async loadUpcomingInterviews(userId: string) {
    return this.prisma.interview.findMany({
      where: {
        userId,
        scheduledAt: { gte: new Date() },
      },
      include: {
        application: {
          select: {
            jobTitle: true,
            companyName: true,
          },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    });
  }

  private async loadInterview(userId: string, interviewId: string) {
    const interview = await this.loadInterviewRecord(userId, interviewId);
    if (!interview) {
      throw new NotFoundException('Interview not found.');
    }
    return [interview];
  }

  private async loadInterviewRecord(userId: string, interviewId: string) {
    return this.prisma.interview.findFirst({
      where: { id: interviewId, userId },
      include: {
        application: {
          select: {
            jobTitle: true,
            companyName: true,
          },
        },
      },
    });
  }
}
