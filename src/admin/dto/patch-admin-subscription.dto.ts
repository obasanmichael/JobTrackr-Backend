import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** At least one field should be set (enforced in service). */
export class PatchAdminSubscriptionDto {
  @ApiPropertyOptional({ description: 'Target plan `code` from `plans`.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  planCode?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
