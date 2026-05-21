import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Subscription snapshot attached to `/admin/users/:id`. */
export class AdminUserSubscriptionSnapshotDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  billingProvider!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Plan code when a subscription/plan relation exists.',
  })
  planCode!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Marketing name of the subscribed plan.',
  })
  planName!: string | null;
}

export class AdminUserDetailDto extends AdminUserSummaryDto {
  @ApiPropertyOptional({
    type: AdminUserSubscriptionSnapshotDto,
    nullable: true,
  })
  subscription!: AdminUserSubscriptionSnapshotDto | null;
}

export class AdminUsersPageResponseDto {
  @ApiProperty({ type: [AdminUserSummaryDto] })
  items!: AdminUserSummaryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
