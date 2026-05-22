import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalendarEventSourceType,
  CalendarEventSyncStatus,
  CalendarProvider,
} from '@prisma/client';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CalendarConnectResponseDto {
  @ApiProperty({ example: 'https://accounts.google.com/o/oauth2/v2/auth?...' })
  authorizationUrl!: string;
}

export class CalendarStatusResponseDto {
  @ApiProperty({ enum: CalendarProvider, nullable: true })
  provider!: CalendarProvider | null;

  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiPropertyOptional({ example: 'user@gmail.com' })
  providerAccountEmail?: string | null;

  @ApiPropertyOptional()
  lastSyncAt?: Date | null;

  @ApiPropertyOptional()
  lastError?: string | null;

  @ApiProperty({ example: true })
  autoSyncInterviews!: boolean;
}

export class PatchCalendarSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoSyncInterviews?: boolean;
}

export class SyncInterviewsDto {
  @ApiPropertyOptional({
    description:
      'Sync a single interview; omit to sync all upcoming interviews.',
  })
  @IsOptional()
  @IsUUID()
  interviewId?: string;
}

export class CalendarSyncResultItemDto {
  @ApiProperty()
  interviewId!: string;

  @ApiProperty({ enum: CalendarEventSyncStatus })
  syncStatus!: CalendarEventSyncStatus;

  @ApiPropertyOptional()
  providerEventId?: string | null;

  @ApiPropertyOptional()
  error?: string | null;
}

export class SyncInterviewsResponseDto {
  @ApiProperty({ type: [CalendarSyncResultItemDto] })
  results!: CalendarSyncResultItemDto[];

  @ApiProperty()
  syncedCount!: number;

  @ApiProperty()
  failedCount!: number;
}

export class CalendarEventMappingDto {
  @ApiProperty({ enum: CalendarEventSourceType })
  sourceType!: CalendarEventSourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiPropertyOptional()
  providerEventId?: string | null;

  @ApiProperty({ enum: CalendarEventSyncStatus })
  syncStatus!: CalendarEventSyncStatus;

  @ApiPropertyOptional()
  lastSyncedAt?: Date | null;
}
