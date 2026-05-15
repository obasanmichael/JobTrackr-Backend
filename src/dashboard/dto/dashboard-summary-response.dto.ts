import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardReminderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  dueDate!: Date;
}

export class DashboardInterviewItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  interviewType!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  scheduledAt!: Date;
}

export class DashboardRecentEventItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class DashboardSummaryResponseDto {
  @ApiProperty()
  totalApplications!: number;

  @ApiProperty()
  activeApplications!: number;

  @ApiProperty()
  offerCount!: number;

  @ApiProperty()
  rejectionCount!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      SAVED: 1,
      APPLIED: 2,
      SCREENING: 0,
      INTERVIEW: 1,
      TECHNICAL_ASSESSMENT: 0,
      FINAL_INTERVIEW: 0,
      OFFER: 1,
      REJECTED: 0,
      WITHDRAWN: 0,
    },
  })
  applicationsByStatus!: Record<string, number>;

  @ApiProperty({ type: DashboardReminderItemDto, isArray: true })
  upcomingReminders!: DashboardReminderItemDto[];

  @ApiProperty({ type: DashboardInterviewItemDto, isArray: true })
  upcomingInterviews!: DashboardInterviewItemDto[];

  @ApiProperty({ type: DashboardRecentEventItemDto, isArray: true })
  recentEvents!: DashboardRecentEventItemDto[];
}
