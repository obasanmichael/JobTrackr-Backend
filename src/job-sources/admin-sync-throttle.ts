import { seconds } from '@nestjs/throttler';

const configured = Number(process.env.ADMIN_SYNC_THROTTLE_LIMIT ?? '10');

/** Per-minute cap for admin job-source sync triggers (single + bulk). */
export const ADMIN_SYNC_THROTTLE_LIMIT =
  Number.isFinite(configured) && configured > 0 ? configured : 10;

export const ADMIN_SYNC_THROTTLE = {
  default: {
    limit: ADMIN_SYNC_THROTTLE_LIMIT,
    ttl: seconds(60),
  },
} as const;
