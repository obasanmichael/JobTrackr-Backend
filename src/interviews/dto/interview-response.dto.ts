import { InterviewStage, InterviewType } from './interview.enums';

export class InterviewResponseDto {
  id!: string;
  userId!: string;
  applicationId!: string;
  stage!: InterviewStage;
  interviewType!: InterviewType;
  scheduledAt!: Date;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  outcome?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
