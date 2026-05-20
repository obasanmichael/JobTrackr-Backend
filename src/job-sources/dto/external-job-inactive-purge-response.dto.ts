import { ApiProperty } from '@nestjs/swagger';

export class ExternalJobInactivePurgeResponseDto {
  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  retentionDays!: number;

  @ApiProperty()
  cutoff!: string;

  @ApiProperty()
  matchedCount!: number;

  @ApiProperty()
  deletedCount!: number;

  @ApiProperty()
  durationMs!: number;
}
