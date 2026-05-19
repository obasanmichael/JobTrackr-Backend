import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly applicationStatuses = [
    'SAVED',
    'APPLIED',
    'SCREENING',
    'INTERVIEW',
    'TECHNICAL_ASSESSMENT',
    'FINAL_INTERVIEW',
    'OFFER',
    'REJECTED',
    'WITHDRAWN',
  ] as const;

  private readonly activeStatuses = new Set([
    'APPLIED',
    'SCREENING',
    'INTERVIEW',
    'TECHNICAL_ASSESSMENT',
    'FINAL_INTERVIEW',
  ]);

  async getSummary(
    currentUser: CurrentUser,
  ): Promise<DashboardSummaryResponseDto> {
    const now = new Date();

    const [
      totalApplications,
      groupedByStatus,
      upcomingReminders,
      upcomingInterviews,
      recentEvents,
    ] = await Promise.all([
      this.prismaService.jobApplication.count({
        where: { userId: currentUser.userId },
      }),
      this.prismaService.jobApplication.groupBy({
        by: ['status'],
        where: { userId: currentUser.userId },
        _count: { _all: true },
      }),
      this.prismaService.reminder.findMany({
        where: {
          userId: currentUser.userId,
          isCompleted: false,
          dueDate: { gte: now },
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        take: 5,
        select: {
          id: true,
          applicationId: true,
          title: true,
          dueDate: true,
        },
      }),
      this.prismaService.interview.findMany({
        where: {
          userId: currentUser.userId,
          scheduledAt: { gte: now },
        },
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
        take: 5,
        select: {
          id: true,
          applicationId: true,
          stage: true,
          interviewType: true,
          scheduledAt: true,
        },
      }),
      this.prismaService.applicationEvent.findMany({
        where: { userId: currentUser.userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
        select: {
          id: true,
          applicationId: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    const applicationsByStatus = this.applicationStatuses.reduce<
      Record<string, number>
    >((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});

    for (const group of groupedByStatus) {
      applicationsByStatus[group.status] = group._count._all;
    }

    const activeApplications = Object.entries(applicationsByStatus).reduce(
      (count, [status, value]) =>
        this.activeStatuses.has(status) ? count + value : count,
      0,
    );

    return {
      totalApplications,
      activeApplications,
      offerCount: applicationsByStatus.OFFER ?? 0,
      rejectionCount: applicationsByStatus.REJECTED ?? 0,
      applicationsByStatus,
      upcomingReminders,
      upcomingInterviews,
      recentEvents,
    };
  }
}
