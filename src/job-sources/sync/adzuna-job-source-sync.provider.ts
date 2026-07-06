import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExternalJobEmploymentType,
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

/** Adzuna caps results_per_page at 50. */
const MAX_RESULTS_PER_PAGE = 50;
const DEFAULT_RESULTS_PER_PAGE = 50;
const DEFAULT_MAX_PAGES = 5;
const MAX_PAGES_CAP = 20;

/** ISO country codes Adzuna serves (subset relevant to launch markets). */
const ADZUNA_CURRENCY_BY_COUNTRY: Record<string, string> = {
  gb: 'GBP',
  us: 'USD',
  at: 'EUR',
  au: 'AUD',
  be: 'EUR',
  br: 'BRL',
  ca: 'CAD',
  ch: 'CHF',
  de: 'EUR',
  es: 'EUR',
  fr: 'EUR',
  in: 'INR',
  it: 'EUR',
  mx: 'MXN',
  nl: 'EUR',
  nz: 'NZD',
  pl: 'PLN',
  sg: 'SGD',
  za: 'ZAR',
};

export type AdzunaSourceConfig = {
  country: string;
  what?: string;
  category?: string;
  maxPages: number;
  resultsPerPage: number;
};

export function readAdzunaSourceConfig(
  source: SourceSubset,
): AdzunaSourceConfig {
  const { config } = source;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Adzuna ingest requires JobSource.config with country');
  }
  const c = config as Record<string, unknown>;

  const countryRaw = c['country'];
  const country =
    typeof countryRaw === 'string' ? countryRaw.trim().toLowerCase() : '';
  if (!(country in ADZUNA_CURRENCY_BY_COUNTRY)) {
    throw new Error(
      `Adzuna ingest requires JobSource.config.country from supported set (got "${country}")`,
    );
  }

  const what =
    typeof c['what'] === 'string' && c['what'].trim()
      ? c['what'].trim()
      : undefined;
  const category =
    typeof c['category'] === 'string' && c['category'].trim()
      ? c['category'].trim()
      : undefined;

  const maxPagesRaw = Number(c['max_pages'] ?? DEFAULT_MAX_PAGES);
  const maxPages =
    Number.isFinite(maxPagesRaw) && maxPagesRaw >= 1
      ? Math.min(Math.floor(maxPagesRaw), MAX_PAGES_CAP)
      : DEFAULT_MAX_PAGES;

  const perPageRaw = Number(c['results_per_page'] ?? DEFAULT_RESULTS_PER_PAGE);
  const resultsPerPage =
    Number.isFinite(perPageRaw) && perPageRaw >= 1
      ? Math.min(Math.floor(perPageRaw), MAX_RESULTS_PER_PAGE)
      : DEFAULT_RESULTS_PER_PAGE;

  return { country, what, category, maxPages, resultsPerPage };
}

/** Map one Adzuna search result → generic listing. Exported for fixtures/tests. */
export function mapAdzunaJobToGenericListing(
  job: Record<string, unknown>,
  countryCode: string,
): GenericJobListingDto {
  const idRaw = job['id'];
  const externalJobId =
    typeof idRaw === 'string' && idRaw.trim()
      ? idRaw.trim()
      : typeof idRaw === 'number'
        ? String(idRaw)
        : '';

  const titleRaw = job['title'];
  const title =
    typeof titleRaw === 'string'
      ? stripAdzunaHighlights(titleRaw).replace(/\s+/g, ' ').trim()
      : '';

  const companyObj = job['company'];
  const companyNameRaw =
    companyObj && typeof companyObj === 'object' && !Array.isArray(companyObj)
      ? (companyObj as Record<string, unknown>)['display_name']
      : undefined;
  const company =
    typeof companyNameRaw === 'string'
      ? companyNameRaw.replace(/\s+/g, ' ').trim()
      : '';

  const urlRaw = job['redirect_url'];
  const applicationUrl =
    typeof urlRaw === 'string' && /^https?:\/\//i.test(urlRaw.trim())
      ? urlRaw.trim()
      : null;

  const locationObj = job['location'];
  const locationNameRaw =
    locationObj &&
    typeof locationObj === 'object' &&
    !Array.isArray(locationObj)
      ? (locationObj as Record<string, unknown>)['display_name']
      : undefined;
  const location =
    typeof locationNameRaw === 'string' && locationNameRaw.trim()
      ? locationNameRaw.trim().slice(0, 500)
      : undefined;

  const descriptionRaw = job['description'];
  let description: string | undefined;
  if (typeof descriptionRaw === 'string' && descriptionRaw.trim()) {
    const cleaned = stripAdzunaHighlights(descriptionRaw).trim();
    description =
      cleaned.length <= DESCRIPTION_MAX_CHARS
        ? cleaned
        : `${cleaned.slice(0, DESCRIPTION_MAX_CHARS - 1)}…`;
  }

  // Adzuna marks estimated salaries with salary_is_predicted="1"; only
  // employer-stated figures are trustworthy enough to surface.
  const predicted = job['salary_is_predicted'];
  const salaryTrusted = predicted !== '1' && predicted !== 1;
  const salaryMin = salaryTrusted
    ? coerceNonNegativeInt(job['salary_min'])
    : undefined;
  const salaryMax = salaryTrusted
    ? coerceNonNegativeInt(job['salary_max'])
    : undefined;
  const currency =
    salaryMin != null || salaryMax != null
      ? ADZUNA_CURRENCY_BY_COUNTRY[countryCode]
      : undefined;

  const employmentType = mapAdzunaContractToEmploymentType(
    job['contract_time'],
    job['contract_type'],
  );

  const postedAt = parseIsoOptional(job['created']);

  return {
    externalJobId,
    title,
    company,
    applicationUrl,
    ...(location ? { location } : {}),
    country: countryCode.toUpperCase(),
    ...(description ? { description } : {}),
    ...(salaryMin != null ? { salaryMin } : {}),
    ...(salaryMax != null ? { salaryMax } : {}),
    ...(currency ? { currency } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(postedAt ? { postedAt } : {}),
  };
}

/** Adzuna wraps matched terms in <strong> tags inside title/description. */
function stripAdzunaHighlights(v: string): string {
  return v.replace(/<\/?strong>/gi, '');
}

function coerceNonNegativeInt(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return undefined;
  }
  const n = Math.round(v);
  return n >= 0 ? n : undefined;
}

function mapAdzunaContractToEmploymentType(
  contractTime: unknown,
  contractType: unknown,
): ExternalJobEmploymentType | undefined {
  const time =
    typeof contractTime === 'string' ? contractTime.trim().toLowerCase() : '';
  const type =
    typeof contractType === 'string' ? contractType.trim().toLowerCase() : '';
  if (type === 'contract') {
    return ExternalJobEmploymentType.CONTRACT;
  }
  if (time === 'part_time') {
    return ExternalJobEmploymentType.PART_TIME;
  }
  if (time === 'full_time') {
    return ExternalJobEmploymentType.FULL_TIME;
  }
  return undefined;
}

function parseIsoOptional(v: unknown): Date | undefined {
  if (typeof v !== 'string' || !v.trim()) {
    return undefined;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class AdzunaJobSourceSyncProvider implements JobSourceSyncPort {
  constructor(private readonly configService: ConfigService) {}

  private readCredentials(): { appId: string; appKey: string } {
    const appId = this.configService.get<string>('ADZUNA_APP_ID')?.trim();
    const appKey = this.configService.get<string>('ADZUNA_APP_KEY')?.trim();
    if (!appId || !appKey) {
      throw new Error(
        'Adzuna ingest requires ADZUNA_APP_ID and ADZUNA_APP_KEY env vars',
      );
    }
    return { appId, appKey };
  }

  async fetchSnapshot(source: SourceSubset): Promise<JobSourceSyncFetchResult> {
    const { appId, appKey } = this.readCredentials();
    const cfg = readAdzunaSourceConfig(source);

    const combined: GenericJobListingDto[] = [];

    for (let page = 1; page <= cfg.maxPages; page++) {
      const url = `https://api.adzuna.com/v1/api/jobs/${cfg.country}/search/${page}`;

      const response = await axios.get<unknown>(url, {
        timeout: JOB_INGEST_AXIOS_TIMEOUT_MS,
        headers: { 'User-Agent': JOB_INGEST_USER_AGENT },
        params: {
          app_id: appId,
          app_key: appKey,
          results_per_page: cfg.resultsPerPage,
          sort_by: 'date',
          ...(cfg.what ? { what: cfg.what } : {}),
          ...(cfg.category ? { category: cfg.category } : {}),
        },
        validateStatus: (status) => status === 200,
      });

      const data = response.data;
      const results =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)['results']
          : undefined;
      if (!Array.isArray(results)) {
        throw new Error('Adzuna search response missing results array');
      }

      for (const row of results as Record<string, unknown>[]) {
        combined.push(mapAdzunaJobToGenericListing(row, cfg.country));
      }

      if (results.length < cfg.resultsPerPage) {
        break;
      }
    }

    return { rawListings: combined };
  }
}
