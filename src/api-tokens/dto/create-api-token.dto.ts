import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApiTokenDto {
  @ApiProperty({ example: 'Claude', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
