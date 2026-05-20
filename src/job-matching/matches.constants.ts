import { seconds } from '@nestjs/throttler';

const configured = Number(process.env.MATCHES_GENERATE_THROTTLE_LIMIT ?? '10');

export const MATCHES_GENERATE_THROTTLE_LIMIT =
  Number.isFinite(configured) && configured > 0 ? configured : 10;

export const MATCHES_GENERATE_THROTTLE = {
  default: {
    limit: MATCHES_GENERATE_THROTTLE_LIMIT,
    ttl: seconds(60),
  },
} as const;

export const MATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MATCH_JOB_POOL_SIZE = 250;
export const MATCH_RESULT_LIMIT = 50;
