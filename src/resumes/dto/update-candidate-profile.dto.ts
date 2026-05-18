import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCandidateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string;

  /** Free-form arrays (e.g. string tags); stored as JSON */
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  skills?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tools?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  roles?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  industries?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  locations?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  workModes?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  education?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  certifications?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  projects?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  experience?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}
