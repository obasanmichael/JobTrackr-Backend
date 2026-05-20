import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminJobQualityController } from './admin-job-quality.controller';
import { AdminJobSourceSubmissionsController } from './admin-job-source-submissions.controller';
import { AdminJobSourcesController } from './admin-job-sources.controller';
import { ExternalJobQualityService } from './external-job-quality.service';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import { JobSourceSubmissionsController } from './job-source-submissions.controller';
import { JobSourceSubmissionsService } from './job-source-submissions.service';
import { JobSourcesService } from './job-sources.service';
import { GreenhouseJobSourceSyncProvider } from './sync/greenhouse-job-source-sync.provider';
import { LeverJobSourceSyncProvider } from './sync/lever-job-source-sync.provider';
import { NoopJobSourceSyncProvider } from './sync/noop-job-source-sync.provider';
import { RegistryJobSourceSyncProvider } from './sync/registry-job-source-sync.provider';
import { JOB_SOURCE_SYNC_PORT } from './sync/job-source-sync.tokens';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminJobSourcesController,
    AdminJobQualityController,
    AdminJobSourceSubmissionsController,
    JobSourceSubmissionsController,
  ],
  providers: [
    JobSourcesService,
    JobSourceSubmissionsService,
    ExternalJobQualityService,
    JobIngestOrchestrationService,
    AdminGuard,
    OptionalJwtAuthGuard,
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
