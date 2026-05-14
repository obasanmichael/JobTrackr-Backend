import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from './application.enums';

export class ApplicationQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['deadline', 'createdAt'])
  sort?: 'deadline' | 'createdAt';
}
