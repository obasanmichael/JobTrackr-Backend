import {
  jobSourceSyncFailureHealthData,
  jobSourceSyncSuccessHealthData,
  nextJobSourceSyncFailureState,
} from './job-source-sync-health';

describe('job-source-sync-health', () => {
  it('increments consecutive failures and alerts at threshold', () => {
    expect(nextJobSourceSyncFailureState(0)).toEqual({
      consecutiveSyncFailures: 1,
      shouldAlert: false,
    });
    expect(nextJobSourceSyncFailureState(2)).toEqual({
      consecutiveSyncFailures: 3,
      shouldAlert: true,
    });
  });

  it('builds prisma update payloads', () => {
    const syncedAt = new Date('2026-05-19T12:00:00.000Z');

    expect(jobSourceSyncSuccessHealthData(syncedAt)).toEqual({
      lastSyncAt: syncedAt,
      lastSuccessAt: syncedAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveSyncFailures: 0,
    });

    expect(jobSourceSyncFailureHealthData(syncedAt, 'network down', 3)).toEqual(
      {
        lastSyncAt: syncedAt,
        lastErrorAt: syncedAt,
        lastErrorMessage: 'network down',
        consecutiveSyncFailures: 3,
      },
    );
  });
});
