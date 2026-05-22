import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkMode } from '@prisma/client';
import { JobListingSourceDto } from './job-listing-source.dto';

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

  @ApiPropertyOptional({
    description: 'Apply or job detail URL when available',
  })
  applyUrl!: string | null;

  @ApiPropertyOptional()
  salaryMin!: number | null;

  @ApiPropertyOptional()
  salaryMax!: number | null;

  @ApiPropertyOptional({ example: 'USD' })
  currency!: string | null;

  @ApiPropertyOptional({
    description: 'Ingestion source display name (alias of sourceMeta.name)',
  })
  source!: string | null;

  @ApiPropertyOptional({
    type: JobListingSourceDto,
    description:
      'Ingestion source metadata (name + type); raw provider payloads are never exposed',
  })
  sourceMeta!: JobListingSourceDto | null;

  @ApiPropertyOptional({
    description: 'When the posting was scraped or advertised',
  })
  postedAt!: string | null;

  /** Optional opaque payload for debugging or future UX */
  @ApiPropertyOptional()
  excerpt!: string | null;
}
