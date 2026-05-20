import { Module } from '@nestjs/common';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ApplicationsModule,
    ApplicationEventsModule,
  ],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
  exports: [SavedJobsService],
})
export class SavedJobsModule {}
