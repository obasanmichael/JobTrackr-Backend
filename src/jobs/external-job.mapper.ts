import type { ExternalJob } from '@prisma/client';
import type { JobListingDto } from './dto/job-listing.dto';
import { buildJobExcerpt } from './job-search.filters';
import { remoteTypeToWorkMode } from './job-search.filters';

export function mapExternalJobToListingDto(row: ExternalJob): JobListingDto {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company,
    location: row.location,
    workMode: remoteTypeToWorkMode(row.remoteType),
    applyUrl: row.applicationUrl,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    currency: row.currency,
    source: row.sourceName,
    postedAt: row.postedAt?.toISOString() ?? null,
    excerpt: buildJobExcerpt(row.description),
  };
}
