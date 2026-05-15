import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationSource, ApplicationStatus, WorkMode } from './application.enums';

export class ApplicationResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  jobTitle!: string;
  @ApiProperty()
  companyName!: string;
  @ApiPropertyOptional()
  jobUrl?: string | null;
  @ApiPropertyOptional()
  location?: string | null;
  @ApiProperty({ enum: WorkMode })
  workMode!: WorkMode;
  @ApiPropertyOptional()
  salaryMin?: number | null;
  @ApiPropertyOptional()
  salaryMax?: number | null;
  @ApiPropertyOptional()
  currency?: string | null;
  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;
  @ApiPropertyOptional({ enum: ApplicationSource })
  source?: ApplicationSource | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  deadline?: Date | null;
  @ApiPropertyOptional()
  notes?: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
