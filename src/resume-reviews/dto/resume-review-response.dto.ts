import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResumeReviewStatus,
  ResumeReviewType,
} from '@prisma/client';

export class ResumeReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  resumeId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  applicationId!: string | null;

  @ApiPropertyOptional({ description: 'External/normalized job id when connected' })
  jobId!: string | null;

  @ApiProperty({ enum: ResumeReviewType })
  type!: ResumeReviewType;

  @ApiPropertyOptional()
  overallScore!: number | null;

  @ApiPropertyOptional()
  atsScore!: number | null;

  @ApiPropertyOptional()
  keywordScore!: number | null;

  @ApiPropertyOptional()
  structureScore!: number | null;

  @ApiPropertyOptional()
  clarityScore!: number | null;

  @ApiPropertyOptional({
    description: 'Structured JSON from validated AI output',
  })
  strengths!: unknown[] | Record<string, unknown> | null;

  @ApiPropertyOptional()
  weaknesses!: unknown[] | Record<string, unknown> | null;

  @ApiPropertyOptional()
  missingKeywords!: unknown[] | Record<string, unknown> | null;

  @ApiPropertyOptional()
  suggestions!: unknown[] | Record<string, unknown> | null;

  @ApiPropertyOptional()
  improvedBullets!: unknown[] | Record<string, unknown> | null;

  @ApiPropertyOptional()
  summary!: string | null;

  @ApiPropertyOptional({
    description: 'Structured payload plus provider blob for debugging',
  })
  rawAiOutput!: Record<string, unknown> | null;

  @ApiProperty({ enum: ResumeReviewStatus })
  status!: ResumeReviewStatus;

  @ApiPropertyOptional()
  errorMessage!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
