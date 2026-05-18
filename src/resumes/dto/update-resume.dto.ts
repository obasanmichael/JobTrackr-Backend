import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeParseStatus } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateResumeDto {
  @ApiPropertyOptional({ description: 'Mark this resume as the active CV for matching' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: [ResumeParseStatus.ARCHIVED],
    description: 'Soft-archive this resume (cannot be combined with activating it)',
  })
  @IsOptional()
  @IsIn([ResumeParseStatus.ARCHIVED])
  status?: ResumeParseStatus;
}
