import { ApiPropertyOptional } from '@nestjs/swagger';
import { SavedJobStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class PatchSavedJobDto {
  @ApiPropertyOptional({
    enum: SavedJobStatus,
    enumName: 'SavedJobStatus',
  })
  @IsOptional()
  @IsEnum(SavedJobStatus)
  status?: SavedJobStatus;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;
}
