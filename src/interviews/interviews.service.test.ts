import { NotFoundException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewStage, InterviewType } from './dto/interview.enums';

describe('InterviewsService', () => {
  let service: InterviewsService;
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

    service = new InterviewsService(prismaService as never);
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

    expect(prismaService.jobApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'app-1', userId: 'user-1' }),
      }),
    );
    expect(prismaService.interview.create).toHaveBeenCalled();
  });

  it('throws not found for cross-user interview access', async () => {
    prismaService.interview.findFirst.mockResolvedValue(null);

    await expect(
      service.remove(
        { userId: 'user-2', email: 'user2@example.com' },
        'int-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds upcoming query with deterministic ordering', async () => {
    prismaService.interview.findMany.mockResolvedValue([]);

    await service.findUpcoming({ userId: 'user-1', email: 'user@example.com' });

    expect(prismaService.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          scheduledAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
