export class DashboardReminderItemDto {
  id!: string;
  applicationId!: string;
  title!: string;
  dueDate!: Date;
}

export class DashboardInterviewItemDto {
  id!: string;
  applicationId!: string;
  stage!: string;
  interviewType!: string;
  scheduledAt!: Date;
}

export class DashboardRecentEventItemDto {
  id!: string;
  applicationId!: string;
  type!: string;
  title!: string;
  description?: string | null;
  createdAt!: Date;
}

export class DashboardSummaryResponseDto {
  totalApplications!: number;
  activeApplications!: number;
  offerCount!: number;
  rejectionCount!: number;
  applicationsByStatus!: Record<string, number>;
  upcomingReminders!: DashboardReminderItemDto[];
  upcomingInterviews!: DashboardInterviewItemDto[];
  recentEvents!: DashboardRecentEventItemDto[];
}
