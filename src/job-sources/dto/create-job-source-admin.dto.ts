import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSourceType } from '@prisma/client';
import { Allow, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateJobSourceAdminDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: JobSourceType, enumName: 'JobSourceType' })
  @IsEnum(JobSourceType)
  type!: JobSourceType;

  @ApiPropertyOptional({ description: 'Optional public board / API root URL hint' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  baseUrl?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresApiKey?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
    description:
      'Provider-specific opaque JSON (e.g. `{ "board_token": "..." }`). Null clears when used on PATCH.',
  })
  @IsOptional()
  @Allow()
  config?: Record<string, unknown> | null;
}
