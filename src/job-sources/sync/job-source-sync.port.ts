import type { JobSource } from '@prisma/client';

/** Result from a concrete provider adapter (pre-normalization, §9.3). */
export type JobSourceSyncFetchResult = {
  /** Opaque payloads; mapped to `ExternalJob` in V2C.4+. */
  rawListings: readonly unknown[];
};

/**
 * Adapter that talks to one external ingestion mechanism (RSS, ATS API, scrape, manual feed).
 * V2C.6 orchestration will invoke this inside sync runs.
 */
export interface JobSourceSyncPort {
  fetchSnapshot(
    source: Pick<
      JobSource,
      | 'id'
      | 'name'
      | 'type'
      | 'baseUrl'
      | 'requiresApiKey'
      | 'isActive'
      | 'config'
    >,
  ): Promise<JobSourceSyncFetchResult>;
}
