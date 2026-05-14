import {
  ApplicationSource as PrismaApplicationSource,
  ApplicationStatus as PrismaApplicationStatus,
  WorkMode as PrismaWorkMode,
} from '@prisma/client';

export const ApplicationStatus = PrismaApplicationStatus;
export type ApplicationStatus =
  (typeof PrismaApplicationStatus)[keyof typeof PrismaApplicationStatus];

export const WorkMode = PrismaWorkMode;
export type WorkMode = (typeof PrismaWorkMode)[keyof typeof PrismaWorkMode];

export const ApplicationSource = PrismaApplicationSource;
export type ApplicationSource =
  (typeof PrismaApplicationSource)[keyof typeof PrismaApplicationSource];
