import { Injectable } from '@nestjs/common';
import type { JobSource } from '@prisma/client';
import type { JobSourceSyncPort } from './job-source-sync.port';

@Injectable()
export class NoopJobSourceSyncProvider implements JobSourceSyncPort {
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
  ): Promise<{ rawListings: readonly unknown[] }> {
    void source;
    return Promise.resolve({ rawListings: [] });
  }
}
