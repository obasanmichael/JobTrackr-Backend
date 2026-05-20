import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExternalExperienceLevel,
  ExternalJobEmploymentType,
} from '@prisma/client';
import { JobListingDto } from './job-listing.dto';

export class JobDetailDto extends JobListingDto {
  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  requirements!: string | null;

  @ApiPropertyOptional({
    enum: ExternalExperienceLevel,
    enumName: 'ExternalExperienceLevel',
  })
  experienceLevel!: ExternalExperienceLevel;

  @ApiPropertyOptional({
    enum: ExternalJobEmploymentType,
    enumName: 'ExternalJobEmploymentType',
  })
  employmentType!: ExternalJobEmploymentType;

  @ApiPropertyOptional()
  country!: string | null;
}
