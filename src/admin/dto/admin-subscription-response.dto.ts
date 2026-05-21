import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminSubscriptionUserSnapshotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;
}

export class AdminSubscriptionPlanSnapshotDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class AdminSubscriptionRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: AdminSubscriptionUserSnapshotDto })
  user!: AdminSubscriptionUserSnapshotDto;

  @ApiProperty({ type: AdminSubscriptionPlanSnapshotDto })
  plan!: AdminSubscriptionPlanSnapshotDto;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  billingProvider!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  stripeCustomerId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  stripeSubscriptionId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminSubscriptionsPageResponseDto {
  @ApiProperty({ type: [AdminSubscriptionRowDto] })
  items!: AdminSubscriptionRowDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
