import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from './application.enums';

export class ApplicationQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsIn(['deadline', 'createdAt'])
  @Transform(({ value }: { value: string }) => value?.trim())
  sort?: 'deadline' | 'createdAt';
}
