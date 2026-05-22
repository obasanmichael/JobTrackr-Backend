import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanSummaryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Monthly price in minor units (e.g. cents); null when free.',
  })
  priceMonthly!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({
    description:
      'Whether checkout can target this plan (Stripe price configured).',
  })
  checkoutAvailable!: boolean;

  @ApiProperty()
  isBeta!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

export class EntitlementEntryDto {
  @ApiProperty()
  featureKey!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiPropertyOptional({
    description:
      'Monthly quota where applicable (e.g. AI reviews); null means unlimited / inherit env defaults.',
  })
  limitValue!: number | null;
}

export class BillingMeResponseDto {
  @ApiProperty()
  planCode!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty({
    enum: ['BETA', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED'],
  })
  subscriptionStatus!: string;

  @ApiProperty({ enum: ['NONE', 'STRIPE'] })
  billingProvider!: string;

  @ApiPropertyOptional()
  stripeCustomerId!: string | null;

  @ApiPropertyOptional()
  stripeSubscriptionId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  currentPeriodEnd!: Date | null;

  @ApiProperty({ type: [EntitlementEntryDto] })
  entitlements!: EntitlementEntryDto[];

  @ApiProperty({
    description: 'Whether Stripe checkout is configured server-side.',
  })
  stripeConfigured!: boolean;
}

export class EntitlementsMeResponseDto {
  @ApiProperty({ type: [EntitlementEntryDto] })
  entitlements!: EntitlementEntryDto[];
}
