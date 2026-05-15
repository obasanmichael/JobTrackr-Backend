import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewStage, InterviewType } from './interview.enums';

export class InterviewResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  applicationId!: string;
  @ApiProperty({ enum: InterviewStage })
  stage!: InterviewStage;
  @ApiProperty({ enum: InterviewType })
  interviewType!: InterviewType;
  @ApiProperty({ type: String, format: 'date-time' })
  scheduledAt!: Date;
  @ApiPropertyOptional()
  location?: string | null;
  @ApiPropertyOptional()
  meetingLink?: string | null;
  @ApiPropertyOptional()
  notes?: string | null;
  @ApiPropertyOptional()
  outcome?: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
