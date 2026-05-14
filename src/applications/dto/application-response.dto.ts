import { ApplicationSource, ApplicationStatus, WorkMode } from './application.enums';

export class ApplicationResponseDto {
  id!: string;
  userId!: string;
  jobTitle!: string;
  companyName!: string;
  jobUrl?: string | null;
  location?: string | null;
  workMode!: WorkMode;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  status!: ApplicationStatus;
  source?: ApplicationSource | null;
  deadline?: Date | null;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
