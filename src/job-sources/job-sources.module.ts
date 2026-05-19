import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminJobSourcesController } from './admin-job-sources.controller';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import { JobSourcesService } from './job-sources.service';
import { GreenhouseJobSourceSyncProvider } from './sync/greenhouse-job-source-sync.provider';
import { LeverJobSourceSyncProvider } from './sync/lever-job-source-sync.provider';
import { NoopJobSourceSyncProvider } from './sync/noop-job-source-sync.provider';
import { RegistryJobSourceSyncProvider } from './sync/registry-job-source-sync.provider';
import { JOB_SOURCE_SYNC_PORT } from './sync/job-source-sync.tokens';

@Module({
  imports: [AuthModule],
  controllers: [AdminJobSourcesController],
  providers: [
    JobSourcesService,
    JobIngestOrchestrationService,
    AdminGuard,
    NoopJobSourceSyncProvider,
    GreenhouseJobSourceSyncProvider,
    LeverJobSourceSyncProvider,
    RegistryJobSourceSyncProvider,
    {
      provide: JOB_SOURCE_SYNC_PORT,
      useExisting: RegistryJobSourceSyncProvider,
    },
  ],
  exports: [
    JobSourcesService,
    JobIngestOrchestrationService,
    AdminGuard,
    JOB_SOURCE_SYNC_PORT,
  ],
})
export class JobSourcesModule {}
