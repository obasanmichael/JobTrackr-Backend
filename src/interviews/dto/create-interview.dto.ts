import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';
import { InterviewStage, InterviewType } from './interview.enums';

export class CreateInterviewDto {
  @IsUUID()
  applicationId!: string;

  @IsEnum(InterviewStage)
  stage!: InterviewStage;

  @IsEnum(InterviewType)
  interviewType!: InterviewType;

  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @IsOptional()
  @IsUrl()
  @Transform(({ value }: { value: string }) => value?.trim())
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  outcome?: string;
}
