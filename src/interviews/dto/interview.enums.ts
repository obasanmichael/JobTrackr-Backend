import {
  InterviewStage as PrismaInterviewStage,
  InterviewType as PrismaInterviewType,
} from '@prisma/client';

export const InterviewStage = PrismaInterviewStage;
export type InterviewStage =
  (typeof PrismaInterviewStage)[keyof typeof PrismaInterviewStage];

export const InterviewType = PrismaInterviewType;
export type InterviewType =
  (typeof PrismaInterviewType)[keyof typeof PrismaInterviewType];
