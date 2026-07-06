import { Injectable } from '@nestjs/common';
import type { JobSource } from '@prisma/client';
import axios from 'axios';
import { z } from 'zod';
import type { GenericJobListingDto } from '../normalization/generic-job-listing.schema';
import {
  JOB_INGEST_AXIOS_TIMEOUT_MS,
  JOB_INGEST_USER_AGENT,
} from './http-ingest-client';
import type {
  JobSourceSyncFetchResult,
  JobSourceSyncPort,
} from './job-source-sync.port';

/** Shape for `GET …/boards/{token}/jobs?content=true`. */
const greenhouseJobsListSchema = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())),
});

const DESCRIPTION_MAX_CHARS = 250_000;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Greenhouse `content` is HTML-escaped HTML (entities escaped twice for text):
 * decode once to recover the markup, strip tags, then decode the text's own
 * entities.
 */
export function greenhouseContentToPlainText(content: string): string {
  const html = decodeHtmlEntities(content);
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

type SourceSubset = Pick<
  JobSource,
  'id' | 'name' | 'type' | 'baseUrl' | 'requiresApiKey' | 'isActive' | 'config'
>;

/** Map one Greenhouse job-board job object → generic listing consumed by ingest. Exported for fixtures/tests. */
export function mapGreenhouseJobToGenericListing(
  job: Record<string, unknown>,
  sourceNameFallback: string,
): GenericJobListingDto {
  const idNum = job['id'];
  const externalJobId =
    typeof idNum === 'number'
      ? String(idNum)
      : typeof idNum === 'string' && idNum.trim()
        ? idNum.trim()
        : '';

  const titleRaw = job['title'];
  const title =
    typeof titleRaw === 'string' ? titleRaw.replace(/\s+/g, ' ').trim() : '';

  const companyRaw = job['company_name'];
  let company =
    typeof companyRaw === 'string'
      ? companyRaw.replace(/\s+/g, ' ').trim()
      : '';
  if (!company) {
    company = sourceNameFallback.trim();
  }

  const urlRaw = job['absolute_url'];
  const applicationUrl =
    typeof urlRaw === 'string' && /^https?:\/\//i.test(urlRaw.trim())
      ? urlRaw.trim()
      : null;

  const loc = job['location'];
  const locationName =
    loc &&
    typeof loc === 'object' &&
    !Array.isArray(loc) &&
    typeof (loc as Record<string, unknown>)['name'] === 'string'
      ? String((loc as Record<string, unknown>)['name'])
          .trim()
          .slice(0, 500)
      : undefined;

  const postedAt =
    parseIsoOptional(job['first_published']) ??
    parseIsoOptional(job['updated_at']);

  const contentRaw = job['content'];
  let description: string | undefined;
  if (typeof contentRaw === 'string' && contentRaw.trim()) {
    const plain = greenhouseContentToPlainText(contentRaw);
    if (plain) {
      description =
        plain.length <= DESCRIPTION_MAX_CHARS
          ? plain
          : `${plain.slice(0, DESCRIPTION_MAX_CHARS - 1)}…`;
    }
  }

  return {
    externalJobId,
    title,
    company,
    ...(applicationUrl != null ? { applicationUrl } : {}),
    ...(locationName ? { location: locationName } : {}),
    ...(postedAt != null ? { postedAt } : {}),
    ...(description ? { description } : {}),
  };
}

function parseIsoOptional(v: unknown): Date | undefined {
  if (typeof v !== 'string' || !v.trim()) {
    return undefined;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function readGreenhouseBoardToken(source: SourceSubset): string {
  const { config } = source;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      'Greenhouse ingest requires JobSource.config with board_token',
    );
  }
  const token = (config as Record<string, unknown>)['board_token'];
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Greenhouse ingest requires JobSource.config.board_token');
  }
  return encodeURIComponent(token.trim());
}

function readGreenhouseBaseUrl(source: SourceSubset): string {
  const { config } = source;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return 'https://boards-api.greenhouse.io/v1';
  }
  const override = (config as Record<string, unknown>)['api_base_override'];
  if (
    typeof override === 'string' &&
    override.trim() &&
    /^https?:\/\//i.test(override.trim())
  ) {
    return override.trim().replace(/\/+$/, '');
  }
  return 'https://boards-api.greenhouse.io/v1';
}

@Injectable()
export class GreenhouseJobSourceSyncProvider implements JobSourceSyncPort {
  async fetchSnapshot(source: SourceSubset): Promise<JobSourceSyncFetchResult> {
    const token = readGreenhouseBoardToken(source);
    const baseUrl = readGreenhouseBaseUrl(source);
    const url = `${baseUrl}/boards/${token}/jobs`;

    const response = await axios.get<unknown>(url, {
      timeout: JOB_INGEST_AXIOS_TIMEOUT_MS,
      headers: { 'User-Agent': JOB_INGEST_USER_AGENT },
      // content=true includes each posting's full HTML description, which
      // job matching needs as its skill-scoring corpus.
      params: { content: 'true' },
      validateStatus: (status) => status === 200,
    });

    const parsed = greenhouseJobsListSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error('Greenhouse job board response missing jobs array');
    }

    const rawListings: GenericJobListingDto[] = parsed.data.jobs.map((job) =>
      mapGreenhouseJobToGenericListing(job, source.name),
    );

    return { rawListings };
  }
}
