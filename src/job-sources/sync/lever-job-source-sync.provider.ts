import { Injectable } from '@nestjs/common';
import {
  ExternalJobEmploymentType,
  ExternalJobRemoteType,
  type JobSource,
} from '@prisma/client';
import axios from 'axios';
import type { GenericJobListingDto } from '../normalization/generic-job-listing.schema';
import {
  JOB_INGEST_AXIOS_TIMEOUT_MS,
  JOB_INGEST_USER_AGENT,
} from './http-ingest-client';
import type {
  JobSourceSyncFetchResult,
  JobSourceSyncPort,
} from './job-source-sync.port';

type SourceSubset = Pick<
  JobSource,
  'id' | 'name' | 'type' | 'baseUrl' | 'requiresApiKey' | 'isActive' | 'config'
>;

const DESCRIPTION_MAX_CHARS = 250_000;

const MAX_LEVER_POSTINGS = 20_000;
const PAGE_LIMIT = 100;

/** Exported for unit tests against captured fixtures */
export function mapLeverPostingToGenericListing(
  posting: Record<string, unknown>,
  sourceNameFallback: string,
): GenericJobListingDto {
  const externalJobIdRaw = posting['id'];
  const externalJobId =
    typeof externalJobIdRaw === 'string' && externalJobIdRaw.trim()
      ? externalJobIdRaw.trim()
      : '';

  const titleRaw = posting['text'];
  const title =
    typeof titleRaw === 'string' ? titleRaw.replace(/\s+/g, ' ').trim() : '';

  const hosted =
    typeof posting['hostedUrl'] === 'string' ? posting['hostedUrl'].trim() : '';
  const apply =
    typeof posting['applyUrl'] === 'string' ? posting['applyUrl'].trim() : '';
  let applicationUrl: string | null = null;
  if (apply && /^https?:\/\//i.test(apply)) {
    applicationUrl = apply;
  } else if (hosted && /^https?:\/\//i.test(hosted)) {
    applicationUrl = hosted;
  }

  const categories = posting['categories'];
  let locationName: string | undefined;
  if (
    categories &&
    typeof categories === 'object' &&
    !Array.isArray(categories) &&
    typeof (categories as Record<string, unknown>)['location'] === 'string'
  ) {
    locationName = (categories as Record<string, unknown>)[
      'location'
    ] as string;
    locationName = locationName.trim().slice(0, 500);
    if (!locationName) locationName = undefined;
  }

  const countryRaw = posting['country'];
  const country =
    typeof countryRaw === 'string' && countryRaw.trim()
      ? countryRaw.trim().slice(0, 120)
      : undefined;

  const remoteType = mapLeverWorkplaceType(posting['workplaceType']);

  const createdMs = posting['createdAt'];
  let postedAt: Date | undefined;
  if (typeof createdMs === 'number' && Number.isFinite(createdMs)) {
    const d = new Date(createdMs);
    postedAt = Number.isNaN(d.getTime()) ? undefined : d;
  }

  const descriptionPlainRaw = posting['descriptionPlain'];
  let description: string | undefined;
  if (typeof descriptionPlainRaw === 'string' && descriptionPlainRaw) {
    description =
      descriptionPlainRaw.length <= DESCRIPTION_MAX_CHARS
        ? descriptionPlainRaw
        : `${descriptionPlainRaw.slice(0, DESCRIPTION_MAX_CHARS - 1)}…`;
  }

  const employmentType = leverageCommitmentToEmploymentType(
    categories && typeof categories === 'object' && !Array.isArray(categories)
      ? (categories as Record<string, unknown>)['commitment']
      : undefined,
  );

  let salaryMin: number | null | undefined;
  let salaryMax: number | null | undefined;
  let currency: string | null | undefined;
  const salaryRange = posting['salaryRange'];
  if (
    salaryRange &&
    typeof salaryRange === 'object' &&
    !Array.isArray(salaryRange)
  ) {
    const sr = salaryRange as Record<string, unknown>;
    const minN = coercePositiveInt(sr['min']);
    const maxN = coercePositiveInt(sr['max']);
    const curRaw = sr['currency'];
    if (
      typeof curRaw === 'string' &&
      curRaw.trim().length >= 3 &&
      curRaw.trim().length <= 8
    ) {
      currency = curRaw.trim().toUpperCase();
    }
    salaryMin = minN ?? null;
    salaryMax = maxN ?? null;
  }

  return {
    externalJobId,
    title,
    company: sourceNameFallback.trim(),
    applicationUrl,
    ...(locationName ? { location: locationName } : {}),
    ...(country ? { country } : {}),
    ...(remoteType != null ? { remoteType } : {}),
    ...(postedAt ? { postedAt } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(description ? { description } : {}),
    ...(salaryMin != null ? { salaryMin } : {}),
    ...(salaryMax != null ? { salaryMax } : {}),
    ...(currency ? { currency } : {}),
  };
}

function coercePositiveInt(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return undefined;
  }
  const n = Math.round(v);
  return n >= 0 ? n : undefined;
}

function mapLeverWorkplaceType(v: unknown): ExternalJobRemoteType | undefined {
  if (typeof v !== 'string' || !v.trim()) {
    return undefined;
  }
  switch (v.trim().toLowerCase()) {
    case 'remote':
      return ExternalJobRemoteType.REMOTE;
    case 'onsite':
      return ExternalJobRemoteType.ONSITE;
    case 'hybrid':
      return ExternalJobRemoteType.HYBRID;
    default:
      return undefined;
  }
}

function leverageCommitmentToEmploymentType(
  commitment: unknown,
): ExternalJobEmploymentType | undefined {
  if (typeof commitment !== 'string' || !commitment.trim()) {
    return undefined;
  }
  const lower = commitment.toLowerCase();
  if (lower.includes('intern')) {
    return ExternalJobEmploymentType.INTERNSHIP;
  }
  if (lower.includes('contract')) {
    return ExternalJobEmploymentType.CONTRACT;
  }
  if (lower.includes('part')) {
    return ExternalJobEmploymentType.PART_TIME;
  }
  if (lower.includes('temp')) {
    return ExternalJobEmploymentType.TEMPORARY;
  }
  if (lower.includes('full')) {
    return ExternalJobEmploymentType.FULL_TIME;
  }
  return undefined;
}

function readLeverSite(source: SourceSubset): string {
  const { config } = source;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      'Lever ingest requires JobSource.config with site (company slug)',
    );
  }
  const site = (config as Record<string, unknown>)['site'];
  if (typeof site !== 'string' || !site.trim()) {
    throw new Error('Lever ingest requires JobSource.config.site');
  }
  return encodeURIComponent(site.trim());
}

/** Public postings endpoint returns JSON array (`mode=json`). */
function postingsPageUrl(site: string, skip: number): string {
  return `https://api.lever.co/v0/postings/${site}?mode=json&limit=${PAGE_LIMIT}&skip=${skip}`;
}

@Injectable()
export class LeverJobSourceSyncProvider implements JobSourceSyncPort {
  async fetchSnapshot(source: SourceSubset): Promise<JobSourceSyncFetchResult> {
    const site = readLeverSite(source);
    let skip = 0;
    const combined: GenericJobListingDto[] = [];

    while (true) {
      const url = postingsPageUrl(site, skip);

      const response = await axios.get<unknown>(url, {
        timeout: JOB_INGEST_AXIOS_TIMEOUT_MS,
        headers: { 'User-Agent': JOB_INGEST_USER_AGENT },
        validateStatus: (status) => status === 200,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Lever postings response expected JSON array');
      }

      const batch = response.data as Record<string, unknown>[];
      for (const row of batch) {
        combined.push(mapLeverPostingToGenericListing(row, source.name));
        if (combined.length > MAX_LEVER_POSTINGS) {
          throw new Error(
            `Lever postings exceeded safety cap (${MAX_LEVER_POSTINGS}); narrow scope or raise cap`,
          );
        }
      }

      if (batch.length === 0 || batch.length < PAGE_LIMIT) {
        break;
      }
      skip += batch.length;
    }

    return { rawListings: combined };
  }
}
