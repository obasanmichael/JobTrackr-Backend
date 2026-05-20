import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ConvertSavedJobDto {
  @ApiPropertyOptional({
    description:
      'Appended to `SavedJob.notes` when building the JobApplication payload',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notesAppend?: string;
}
