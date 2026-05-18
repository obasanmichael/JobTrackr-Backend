import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkMode } from '@prisma/client';

/** Normalized external listing — populated when aggregation is wired */
export class JobListingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  companyName!: string;

  @ApiPropertyOptional()
  location!: string | null;

  @ApiPropertyOptional({ enum: WorkMode })
  workMode!: WorkMode | null;

  @ApiPropertyOptional({ description: 'Apply or job detail URL when available' })
  applyUrl!: string | null;

  @ApiPropertyOptional()
  salaryMin!: number | null;

  @ApiPropertyOptional()
  salaryMax!: number | null;

  @ApiPropertyOptional({ example: 'USD' })
  currency!: string | null;

  @ApiPropertyOptional({
    description: 'Source label (Indeed, LinkedIn, etc.) when available',
  })
  source!: string | null;

  @ApiPropertyOptional({ description: 'When the posting was scraped or advertised' })
  postedAt!: string | null;

  /** Optional opaque payload for debugging or future UX */
  @ApiPropertyOptional()
  excerpt!: string | null;
}
