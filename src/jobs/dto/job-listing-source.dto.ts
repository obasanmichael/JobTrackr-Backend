import { ApiProperty } from '@nestjs/swagger';
import { JobSourceType } from '@prisma/client';

/** Normalized ingestion source metadata exposed on public job listings (§9.3). */
export class JobListingSourceDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: JobSourceType, enumName: 'JobSourceType' })
  type!: JobSourceType;
}
