import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminJobSourcesController } from './admin-job-sources.controller';
import { JobSourcesService } from './job-sources.service';
import { NoopJobSourceSyncProvider } from './sync/noop-job-source-sync.provider';
import { JOB_SOURCE_SYNC_PORT } from './sync/job-source-sync.tokens';

@Module({
  imports: [AuthModule],
  controllers: [AdminJobSourcesController],
  providers: [
    JobSourcesService,
    AdminGuard,
    NoopJobSourceSyncProvider,
    {
      provide: JOB_SOURCE_SYNC_PORT,
      useExisting: NoopJobSourceSyncProvider,
    },
  ],
  exports: [JobSourcesService, AdminGuard, JOB_SOURCE_SYNC_PORT],
})
export class JobSourcesModule {}
