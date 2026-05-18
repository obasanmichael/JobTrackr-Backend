import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeReviewType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateResumeReviewDto {
  @ApiProperty({
    enum: ResumeReviewType,
    enumName: 'ResumeReviewType',
  })
  @IsEnum(ResumeReviewType)
  type!: ResumeReviewType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  resumeId!: string;

  @ApiPropertyOptional({
    description:
      'Required when type is JOB_SPECIFIC — must belong to the signed-in user.',
  })
  @ValidateIf((o: CreateResumeReviewDto) => o.type === ResumeReviewType.JOB_SPECIFIC)
  @IsNotEmpty({ message: 'applicationId is required for JOB_SPECIFIC reviews' })
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description:
      'Opaque external job id (wired when aggregated jobs exist); optional today.',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    description:
      'Optional pasted job description when the server does not store full JD yet.',
    maxLength: 48000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(48000)
  jobDescription?: string;
}

export class ResumeReviewsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
