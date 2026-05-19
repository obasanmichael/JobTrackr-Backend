import { Injectable } from '@nestjs/common';
import type { JobSource } from '@prisma/client';
import { GreenhouseJobSourceSyncProvider } from './greenhouse-job-source-sync.provider';
import { LeverJobSourceSyncProvider } from './lever-job-source-sync.provider';
import { NoopJobSourceSyncProvider } from './noop-job-source-sync.provider';
import type {
  JobSourceSyncFetchResult,
  JobSourceSyncPort,
} from './job-source-sync.port';
import { resolveJobSourceIngestProvider } from './resolve-job-source-ingest-provider';

type SourceSubset = Pick<
  JobSource,
  'id' | 'name' | 'type' | 'baseUrl' | 'requiresApiKey' | 'isActive' | 'config'
>;

/**
 * Delegates ingest to ATS-specific adapters from **`JOB_SOURCE_SYNC_PORT`**.
 * Falls back to **noop** when config does not designate a wired provider.
 */
@Injectable()
export class RegistryJobSourceSyncProvider implements JobSourceSyncPort {
  constructor(
    private readonly noop: NoopJobSourceSyncProvider,
    private readonly greenhouse: GreenhouseJobSourceSyncProvider,
    private readonly lever: LeverJobSourceSyncProvider,
  ) {}

  fetchSnapshot(source: SourceSubset): Promise<JobSourceSyncFetchResult> {
    const resolved = resolveJobSourceIngestProvider(source.config);

    switch (resolved) {
      case 'GREENHOUSE':
        return this.greenhouse.fetchSnapshot(source);
      case 'LEVER':
        return this.lever.fetchSnapshot(source);
      default:
        return this.noop.fetchSnapshot(source);
    }
  }
}
