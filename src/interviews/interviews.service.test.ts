import { NotFoundException } from '@nestjs/common';
import { CalendarSyncService } from '../calendar/calendar-sync.service';
import { InterviewsService } from './interviews.service';
import { InterviewStage, InterviewType } from './dto/interview.enums';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let calendarSync: {
    syncInterviewIfEnabled: jest.Mock;
    deleteInterviewFromCalendarIfConnected: jest.Mock;
  };
  let prismaService: {
    interview: {
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
    calendarSync = {
      syncInterviewIfEnabled: jest.fn().mockResolvedValue(undefined),
      deleteInterviewFromCalendarIfConnected: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    prismaService = {
      interview: {
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

    service = new InterviewsService(
      prismaService as never,
      calendarSync as unknown as CalendarSyncService,
    );
  });

  it('creates interview only when application is owned by user', async () => {
    prismaService.jobApplication.findFirst.mockResolvedValue({ id: 'app-1' });
    prismaService.interview.create.mockResolvedValue({
      id: 'int-1',
      userId: 'user-1',
      applicationId: 'app-1',
      stage: InterviewStage.TECHNICAL_INTERVIEW,
      interviewType: InterviewType.VIDEO,
      scheduledAt: new Date(),
      location: null,
      meetingLink: null,
      notes: null,
      outcome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(
      { userId: 'user-1', email: 'user@example.com' },
      {
        applicationId: 'app-1',
        stage: InterviewStage.TECHNICAL_INTERVIEW,
        interviewType: InterviewType.VIDEO,
        scheduledAt: new Date(),
      },
    );

    expect(prismaService.jobApplication.findFirst).toHaveBeenCalledWith({
      where: { id: 'app-1', userId: 'user-1' },
      select: { id: true },
    });
    expect(prismaService.interview.create).toHaveBeenCalled();
    expect(calendarSync.syncInterviewIfEnabled).toHaveBeenCalledWith(
      'user-1',
      'int-1',
    );
  });

  it('throws not found for cross-user interview access', async () => {
    prismaService.interview.findFirst.mockResolvedValue(null);

    await expect(
      service.remove({ userId: 'user-2', email: 'user2@example.com' }, 'int-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds upcoming query with deterministic ordering', async () => {
    prismaService.interview.findMany.mockResolvedValue([]);

    await service.findUpcoming({ userId: 'user-1', email: 'user@example.com' });

    expect(prismaService.interview.findMany).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- jest mock
    const listArgs = prismaService.interview.findMany.mock.calls[0]?.[0] as {
      where: { userId: string; scheduledAt: { gte: Date } };
      orderBy: unknown;
    };
    expect(listArgs).toBeDefined();
    expect(listArgs.where.userId).toBe('user-1');
    expect(listArgs.where.scheduledAt.gte).toBeInstanceOf(Date);
    expect(listArgs.orderBy).toEqual([{ scheduledAt: 'asc' }, { id: 'asc' }]);
  });
});
