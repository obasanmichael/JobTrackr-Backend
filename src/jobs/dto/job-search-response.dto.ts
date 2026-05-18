import { ApiProperty } from '@nestjs/swagger';
import { JobListingDto } from './job-listing.dto';

export class JobSearchResponseDto {
  @ApiProperty({ type: [JobListingDto] })
  jobs!: JobListingDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
