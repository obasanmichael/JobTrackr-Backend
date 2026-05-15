import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: {
    jobApplication: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    reminder: {
      findMany: jest.Mock;
    };
    interview: {
      findMany: jest.Mock;
    };
    applicationEvent: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      jobApplication: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      reminder: {
        findMany: jest.fn(),
      },
      interview: {
        findMany: jest.fn(),
      },
      applicationEvent: {
        findMany: jest.fn(),
      },
    };

    service = new DashboardService(prismaService as never);
  });

  it('returns stable status map with zero defaults', async () => {
    prismaService.jobApplication.count.mockResolvedValue(3);
    prismaService.jobApplication.groupBy.mockResolvedValue([
      { status: 'APPLIED', _count: { _all: 2 } },
      { status: 'REJECTED', _count: { _all: 1 } },
    ]);
    prismaService.reminder.findMany.mockResolvedValue([]);
    prismaService.interview.findMany.mockResolvedValue([]);
    prismaService.applicationEvent.findMany.mockResolvedValue([]);

    const summary = await service.getSummary({
      userId: 'user-1',
      email: 'user@example.com',
    });

    expect(summary.totalApplications).toBe(3);
    expect(summary.offerCount).toBe(0);
    expect(summary.rejectionCount).toBe(1);
    expect(summary.applicationsByStatus.SAVED).toBe(0);
    expect(summary.applicationsByStatus.APPLIED).toBe(2);
    expect(summary.applicationsByStatus.REJECTED).toBe(1);
  });

  it('derives activeApplications from in-process statuses only', async () => {
    prismaService.jobApplication.count.mockResolvedValue(6);
    prismaService.jobApplication.groupBy.mockResolvedValue([
      { status: 'SAVED', _count: { _all: 1 } },
      { status: 'APPLIED', _count: { _all: 2 } },
      { status: 'FINAL_INTERVIEW', _count: { _all: 1 } },
      { status: 'OFFER', _count: { _all: 1 } },
      { status: 'REJECTED', _count: { _all: 1 } },
    ]);
    prismaService.reminder.findMany.mockResolvedValue([]);
    prismaService.interview.findMany.mockResolvedValue([]);
    prismaService.applicationEvent.findMany.mockResolvedValue([]);

    const summary = await service.getSummary({
      userId: 'user-1',
      email: 'user@example.com',
    });

    expect(summary.activeApplications).toBe(3);
  });
});
