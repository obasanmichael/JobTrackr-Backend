import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSourceType } from '@prisma/client';

export class JobSourceAdminResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: JobSourceType, enumName: 'JobSourceType' })
  type!: JobSourceType;

  @ApiPropertyOptional()
  baseUrl!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  requiresApiKey!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
    description:
      'Provider-specific opaque settings (tokens, site slugs). Admin-only.',
  })
  config!: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastSyncAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastSuccessAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastErrorAt!: Date | null;

  @ApiPropertyOptional()
  lastErrorMessage!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
