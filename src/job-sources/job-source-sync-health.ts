import type { Prisma } from '@prisma/client';
import { JOB_SOURCE_CONSECUTIVE_FAILURE_ALERT_THRESHOLD } from './quality/job-quality.constants';

export type JobSourceSyncHealthUpdate = {
  consecutiveSyncFailures: number;
  shouldAlert: boolean;
};

export function nextJobSourceSyncFailureState(
  currentFailures: number,
  threshold = JOB_SOURCE_CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
): JobSourceSyncHealthUpdate {
  const consecutiveSyncFailures = currentFailures + 1;
  return {
    consecutiveSyncFailures,
    shouldAlert: consecutiveSyncFailures >= threshold,
  };
}

export function jobSourceSyncSuccessHealthData(
  syncedAt: Date,
): Prisma.JobSourceUpdateInput {
  return {
    lastSyncAt: syncedAt,
    lastSuccessAt: syncedAt,
    lastErrorAt: null,
    lastErrorMessage: null,
    consecutiveSyncFailures: 0,
  };
}

export function jobSourceSyncFailureHealthData(
  syncedAt: Date,
  message: string,
  consecutiveSyncFailures: number,
): Prisma.JobSourceUpdateInput {
  return {
    lastSyncAt: syncedAt,
    lastErrorAt: syncedAt,
    lastErrorMessage: message,
    consecutiveSyncFailures,
  };
}
