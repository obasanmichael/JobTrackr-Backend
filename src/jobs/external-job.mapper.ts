import type { ExternalJob, JobSource } from '@prisma/client';
import type { JobListingDto } from './dto/job-listing.dto';
import type { JobListingSourceDto } from './dto/job-listing-source.dto';
import { buildJobExcerpt } from './job-search.filters';
import { remoteTypeToWorkMode } from './job-search.filters';

export type ExternalJobListingRow = ExternalJob & {
  source?: Pick<JobSource, 'name' | 'type'> | null;
};

export function mapExternalJobSourceMeta(
  row: ExternalJobListingRow,
): JobListingSourceDto | null {
  const name = row.source?.name ?? row.sourceName?.trim();
  const type = row.source?.type;
  if (!name || !type) {
    return null;
  }
  return { name, type };
}

export function mapExternalJobToListingDto(
  row: ExternalJobListingRow,
): JobListingDto {
  const sourceMeta = mapExternalJobSourceMeta(row);

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
    source: sourceMeta?.name ?? row.sourceName ?? null,
    sourceMeta,
    postedAt: row.postedAt?.toISOString() ?? null,
    excerpt: buildJobExcerpt(row.description),
  };
}
