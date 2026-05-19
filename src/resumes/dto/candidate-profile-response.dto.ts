import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateProfileResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  resumeId!: string;
  @ApiPropertyOptional()
  headline!: string | null;
  @ApiPropertyOptional()
  summary!: string | null;
  @ApiPropertyOptional({
    type: 'array',
    description: 'Structured JSON from parser / user edits',
  })
  skills!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  tools!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  roles!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  industries!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  yearsOfExperience!: number | null;
  @ApiPropertyOptional()
  locations!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  workModes!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  education!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  certifications!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  projects!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional()
  experience!: unknown[] | Record<string, unknown> | null;
  @ApiPropertyOptional({ description: 'e.g. heuristic:v1 or future llm:v1' })
  extractionPipeline!: string | null;
  @ApiPropertyOptional({
    description: 'Opaque extraction diagnostics / segments',
  })
  rawExtractedData!: Record<string, unknown> | null;
  @ApiProperty()
  isConfirmed!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
