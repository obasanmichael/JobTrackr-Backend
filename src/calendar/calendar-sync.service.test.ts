import { CalendarProvider } from '@prisma/client';
import { EntitlementsService } from '../billing/entitlements.service';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleCalendarClient } from './google-calendar.client';
import { PrismaService } from '../prisma/prisma.service';

describe('CalendarSyncService auto sync', () => {
  let service: CalendarSyncService;
  let prisma: {
    interview: { findFirst: jest.Mock };
    calendarEvent: {
      upsert: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };
  let integrations: {
    findActiveIntegration: jest.Mock;
    getValidRefreshToken: jest.Mock;
    recordSyncSuccess: jest.Mock;
    recordSyncFailure: jest.Mock;
    buildInterviewEventTitle: jest.Mock;
    buildInterviewEventDescription: jest.Mock;
  };
  let googleCalendar: {
    upsertEvent: jest.Mock;
    deleteEvent: jest.Mock;
  };

  const integration = {
    id: 'int-1',
    userId: 'user-1',
    provider: CalendarProvider.GOOGLE,
    autoSyncInterviews: true,
    isActive: true,
    refreshTokenEncrypted: 'enc',
  };

  const interview = {
    id: 'iv-1',
    userId: 'user-1',
    applicationId: 'app-1',
    stage: 'TECHNICAL_INTERVIEW',
    interviewType: 'VIDEO',
    scheduledAt: new Date(Date.now() + 86400000),
    location: null,
    meetingLink: null,
    notes: null,
    outcome: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: { jobTitle: 'Engineer', companyName: 'Acme' },
  };

  beforeEach(() => {
    prisma = {
      interview: { findFirst: jest.fn() },
      calendarEvent: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    integrations = {
      findActiveIntegration: jest.fn(),
      getValidRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      recordSyncSuccess: jest.fn(),
      recordSyncFailure: jest.fn(),
      buildInterviewEventTitle: jest
        .fn()
        .mockReturnValue('Acme — technical interview'),
      buildInterviewEventDescription: jest.fn().mockReturnValue('JobTrackr'),
    };
    googleCalendar = {
      upsertEvent: jest.fn().mockResolvedValue('google-event-1'),
      deleteEvent: jest.fn(),
    };

    service = new CalendarSyncService(
      prisma as unknown as PrismaService,
      {} as EntitlementsService,
      integrations as unknown as CalendarIntegrationsService,
      googleCalendar as unknown as GoogleCalendarClient,
    );
  });

  it('syncInterviewIfEnabled no-ops when auto sync is disabled', async () => {
    integrations.findActiveIntegration.mockResolvedValue({
      ...integration,
      autoSyncInterviews: false,
    });

    await service.syncInterviewIfEnabled('user-1', 'iv-1');

    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
  });

  it('syncInterviewIfEnabled upserts Google event when enabled', async () => {
    integrations.findActiveIntegration.mockResolvedValue(integration);
    prisma.interview.findFirst.mockResolvedValue(interview);
    prisma.calendarEvent.upsert.mockResolvedValue({
      id: 'map-1',
      providerEventId: null,
    });
    prisma.calendarEvent.update.mockResolvedValue({});

    await service.syncInterviewIfEnabled('user-1', 'iv-1');

    expect(googleCalendar.upsertEvent).toHaveBeenCalled();
    expect(integrations.recordSyncSuccess).toHaveBeenCalledWith('int-1');
  });

  it('syncInterviewIfEnabled removes calendar event when interview is in the past', async () => {
    integrations.findActiveIntegration.mockResolvedValue(integration);
    prisma.interview.findFirst.mockResolvedValue({
      ...interview,
      scheduledAt: new Date(Date.now() - 86400000),
    });
    prisma.calendarEvent.findUnique.mockResolvedValue({
      id: 'map-1',
      userId: 'user-1',
      providerEventId: 'google-event-1',
    });

    await service.syncInterviewIfEnabled('user-1', 'iv-1');

    expect(googleCalendar.deleteEvent).toHaveBeenCalledWith(
      'refresh-token',
      'google-event-1',
    );
    expect(googleCalendar.upsertEvent).not.toHaveBeenCalled();
  });

  it('deleteInterviewFromCalendarIfConnected removes mapped Google event', async () => {
    integrations.findActiveIntegration.mockResolvedValue(integration);
    prisma.calendarEvent.findUnique.mockResolvedValue({
      id: 'map-1',
      userId: 'user-1',
      providerEventId: 'google-event-1',
    });

    await service.deleteInterviewFromCalendarIfConnected('user-1', 'iv-1');

    expect(googleCalendar.deleteEvent).toHaveBeenCalled();
    expect(prisma.calendarEvent.delete).toHaveBeenCalledWith({
      where: { id: 'map-1' },
    });
  });
});
