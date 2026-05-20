import { seconds } from '@nestjs/throttler';

const configured = Number(
  process.env.JOB_SOURCE_SUBMISSIONS_THROTTLE_LIMIT ?? '10',
);

/** Per-minute cap for public careers page submissions. */
export const JOB_SOURCE_SUBMISSIONS_THROTTLE_LIMIT =
  Number.isFinite(configured) && configured > 0 ? configured : 10;

export const JOB_SOURCE_SUBMISSIONS_THROTTLE = {
  default: {
    limit: JOB_SOURCE_SUBMISSIONS_THROTTLE_LIMIT,
    ttl: seconds(60),
  },
} as const;
