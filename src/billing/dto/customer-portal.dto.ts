import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CustomerPortalDto {
  @ApiPropertyOptional({
    description: 'Return URL after managing billing in Stripe portal.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
