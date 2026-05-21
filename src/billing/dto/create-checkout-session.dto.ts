import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Target plan code (e.g. PRO, PREMIUM).' })
  @IsString()
  @MaxLength(64)
  planCode!: string;

  @ApiPropertyOptional({
    description: 'Absolute URL Stripe redirects to after successful checkout.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Absolute URL Stripe redirects to when checkout is cancelled.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}
