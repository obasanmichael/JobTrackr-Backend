import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalExperienceLevel, WorkMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const POSTED_WITHIN_DAYS = [7, 30, 90] as const;
export type PostedWithinDays = (typeof POSTED_WITHIN_DAYS)[number];

export class JobSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Keyword search across title, company, and description',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({
    enum: ExternalExperienceLevel,
    enumName: 'ExternalExperienceLevel',
  })
  @IsOptional()
  @IsEnum(ExternalExperienceLevel)
  experienceLevel?: ExternalExperienceLevel;

  @ApiPropertyOptional({
    description: 'Minimum salary; matches when job salaryMin or salaryMax meets threshold',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({
    description: 'Filter by ingestion source name (partial match)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;

  @ApiPropertyOptional({
    description: 'Only jobs posted within the last N days',
    enum: POSTED_WITHIN_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(POSTED_WITHIN_DAYS)
  postedWithin?: PostedWithinDays;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
