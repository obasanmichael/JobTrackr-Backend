import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from './application.enums';

export class ApplicationQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: 'acme' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: ['deadline', 'createdAt'] })
  @IsOptional()
  @IsIn(['deadline', 'createdAt'])
  @Transform(({ value }: { value: string }) => value?.trim())
  sort?: 'deadline' | 'createdAt';
}
