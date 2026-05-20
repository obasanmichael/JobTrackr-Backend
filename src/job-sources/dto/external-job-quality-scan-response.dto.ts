import { ApiProperty } from '@nestjs/swagger';

export class ExternalJobQualityScanResponseDto {
  @ApiProperty()
  scannedCount!: number;

  @ApiProperty()
  suspiciousCount!: number;

  @ApiProperty()
  clearedCount!: number;

  @ApiProperty({ type: Object })
  flaggedByReason!: Record<string, number>;

  @ApiProperty()
  durationMs!: number;
}
