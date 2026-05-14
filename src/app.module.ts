import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationEventsModule } from './application-events/application-events.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InterviewsModule } from './interviews/interviews.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    ApplicationEventsModule,
    RemindersModule,
    InterviewsModule,
    DashboardModule,
  ],
})
export class AppModule {}
