import { ApiProperty } from '@nestjs/swagger';

export class JobSourceSyncResponseDto {
  @ApiProperty({ format: 'uuid' })
  jobSourceId!: string;

  @ApiProperty({
    description: 'Number of external job rows upserted in this sync run.',
  })
  upsertedCount!: number;

  @ApiProperty({
    description:
      'Listings dropped because they failed generic normalization validation.',
  })
  skippedInvalid!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Timestamp recorded on the job source as lastSyncAt.',
  })
  syncedAt!: Date;
}
