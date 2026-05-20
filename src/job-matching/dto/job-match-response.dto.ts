import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobListingDto } from '../../jobs/dto/job-listing.dto';

export class JobMatchItemDto {
  @ApiProperty()
  overallScore!: number;

  @ApiProperty()
  matchReason!: string;

  @ApiProperty({ type: [String] })
  matchedSkills!: string[];

  @ApiProperty({ type: [String] })
  missingSkills!: string[];

  @ApiProperty()
  titleScore!: number;

  @ApiProperty()
  skillScore!: number;

  @ApiProperty()
  experienceScore!: number;

  @ApiProperty()
  locationScore!: number;

  @ApiProperty()
  recencyScore!: number;

  @ApiProperty({ type: JobListingDto })
  job!: JobListingDto;
}

export class JobMatchListResponseDto {
  @ApiProperty({ type: [JobMatchItemDto] })
  matches!: JobMatchItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty({
    description: 'True when the user needs a parsed resume/profile before matching.',
  })
  requiresProfile!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  generatedAt!: Date | null;
}

export class JobSingleMatchResponseDto extends JobMatchItemDto {
  @ApiProperty()
  requiresProfile!: boolean;
}
