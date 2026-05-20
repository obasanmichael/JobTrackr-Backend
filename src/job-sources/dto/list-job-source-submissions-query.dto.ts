import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSourceSubmissionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListJobSourceSubmissionsQueryDto {
  @ApiPropertyOptional({
    enum: JobSourceSubmissionStatus,
    enumName: 'JobSourceSubmissionStatus',
    description: 'Filter queue by status (defaults to PENDING when omitted).',
  })
  @IsOptional()
  @IsEnum(JobSourceSubmissionStatus)
  status?: JobSourceSubmissionStatus;
}
