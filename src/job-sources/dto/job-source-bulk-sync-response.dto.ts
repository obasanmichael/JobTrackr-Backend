import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobSourceBulkSyncItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  jobSourceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ok!: boolean;

  @ApiPropertyOptional()
  upsertedCount?: number;

  @ApiPropertyOptional()
  skippedInvalid?: number;

  @ApiPropertyOptional()
  inactivatedCount?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  syncedAt?: Date;

  @ApiPropertyOptional()
  durationMs?: number;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class JobSourceBulkSyncResponseDto {
  @ApiProperty()
  attempted!: number;

  @ApiProperty()
  succeeded!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [JobSourceBulkSyncItemResponseDto] })
  results!: JobSourceBulkSyncItemResponseDto[];
}
