import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class NotificationChannelsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class MatchCategoryPreferenceDto {
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

  @ApiPropertyOptional({ type: NotificationChannelsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  channels?: NotificationChannelsDto;
}

export class TimedCategoryPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ type: NotificationChannelsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  channels?: NotificationChannelsDto;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Minutes before due/scheduled time to notify.',
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  leadMinutes?: number[];
}

export class NotificationCategoriesDto {
  @ApiPropertyOptional({ type: MatchCategoryPreferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MatchCategoryPreferenceDto)
  matches?: MatchCategoryPreferenceDto;

  @ApiPropertyOptional({ type: TimedCategoryPreferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimedCategoryPreferenceDto)
  reminders?: TimedCategoryPreferenceDto;

  @ApiPropertyOptional({ type: TimedCategoryPreferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimedCategoryPreferenceDto)
  interviews?: TimedCategoryPreferenceDto;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty({ type: NotificationCategoriesDto })
  categories!: NotificationCategoriesDto;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  updatedAt?: Date;
}

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({ type: NotificationCategoriesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationCategoriesDto)
  categories?: NotificationCategoriesDto;
}
