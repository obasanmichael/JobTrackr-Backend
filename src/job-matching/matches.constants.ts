import { seconds } from '@nestjs/throttler';

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const configured = Number(process.env.MATCHES_GENERATE_THROTTLE_LIMIT ?? '10');

export const MATCHES_GENERATE_THROTTLE_LIMIT =
  Number.isFinite(configured) && configured > 0 ? configured : 10;

export const MATCHES_GENERATE_THROTTLE = {
  default: {
    limit: MATCHES_GENERATE_THROTTLE_LIMIT,
    ttl: seconds(60),
  },
} as const;

/** How long list GET may reuse `JobMatchResult` without re-scoring (V2E.E2). */
export const MATCH_CACHE_TTL_MS =
  readPositiveInt(process.env.MATCH_CACHE_TTL_HOURS, 24) * 60 * 60 * 1000;

/** Candidate jobs considered when batch-generating matches (deterministic pool cap). */
export const MATCH_JOB_POOL_SIZE = readPositiveInt(
  process.env.MATCH_JOB_POOL_SIZE,
  250,
);

/** Top-N matches returned from batch generation and cache reads. */
export const MATCH_RESULT_LIMIT = readPositiveInt(
  process.env.MATCH_RESULT_LIMIT,
  50,
);
