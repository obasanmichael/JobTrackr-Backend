import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateResumeDto {
  @ApiPropertyOptional({ description: 'Mark this resume as the active CV for matching' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
