import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { ApplicationEventsModule } from './application-events/application-events.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CalendarModule } from './calendar/calendar.module';
import { validateEnv } from './config/env.validation';
import { CryptoModule } from './crypto/crypto.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';
import { InterviewsModule } from './interviews/interviews.module';
import { JobSourcesModule } from './job-sources/job-sources.module';
import { JobMatchingModule } from './job-matching/job-matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { JobsModule } from './jobs/jobs.module';
import { ResumeReviewsModule } from './resume-reviews/resume-reviews.module';
import { ResumesModule } from './resumes/resumes.module';
import { SavedJobsModule } from './saved-jobs/saved-jobs.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttlSeconds = Number(
          configService.get<string>('THROTTLE_TTL_SECONDS') ?? '60',
        );
        const limit = Number(
          configService.get<string>('THROTTLE_LIMIT') ?? '100',
        );

        return [
          {
            name: 'default',
            ttl: seconds(ttlSeconds),
            limit,
          },
        ];
      },
    }),
    PrismaModule,
    CryptoModule,
    AdminModule,
    BillingModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ResumesModule,
    ResumeReviewsModule,
    JobSourcesModule,
    JobMatchingModule,
    JobsModule,
    SavedJobsModule,
    ApplicationsModule,
    ApplicationEventsModule,
    RemindersModule,
    InterviewsModule,
    CalendarModule,
    NotificationsModule,
    InternalModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
