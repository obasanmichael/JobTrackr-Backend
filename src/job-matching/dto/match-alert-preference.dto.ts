import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class MatchAlertPreferenceResponseDto {
  @ApiProperty({
    description: 'Whether match alerts are enabled for this user.',
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'Minimum overall match score (0–100) to include in alerts.',
    minimum: 0,
    maximum: 100,
  })
  minMatchScore!: number;

  @ApiPropertyOptional({
    description: 'Channel toggles, e.g. { "email": true, "push": false }.',
    type: Object,
  })
  channels!: Record<string, boolean> | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastNotifiedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Set once preferences are persisted via PATCH.',
    type: String,
    format: 'date-time',
  })
  updatedAt?: Date;
}

export class UpdateMatchAlertPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minMatchScore?: number;

  @ApiPropertyOptional({
    description: 'Per-channel opt-in flags.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  channels?: Record<string, boolean>;
}
