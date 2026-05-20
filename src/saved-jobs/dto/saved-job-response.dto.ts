import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SavedJobStatus } from '@prisma/client';
import { JobListingDto } from '../../jobs/dto/job-listing.dto';

export class SavedJobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['SAVED', 'DISMISSED', 'CONVERTED_TO_APPLICATION'],
    enumName: 'SavedJobStatus',
  })
  status!: SavedJobStatus;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiPropertyOptional()
  convertedApplicationId!: string | null;

  @ApiProperty()
  jobListingId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: JobListingDto })
  job!: JobListingDto;
}

export class SavedJobListResponseDto {
  @ApiProperty({ type: [SavedJobResponseDto] })
  items!: SavedJobResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
