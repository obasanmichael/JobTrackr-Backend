import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { InterviewStage, InterviewType } from './interview.enums';

export class CreateInterviewDto {
  @ApiProperty()
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ enum: InterviewStage })
  @IsEnum(InterviewStage)
  stage!: InterviewStage;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  interviewType!: InterviewType;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @Transform(({ value }: { value: string }) => value?.trim())
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  outcome?: string;
}
