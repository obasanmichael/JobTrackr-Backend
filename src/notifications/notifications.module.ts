import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { DueNotificationsWorkerService } from './due-notifications.worker.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ConfigModule, AuthModule, EmailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationPreferenceService,
    DueNotificationsWorkerService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferenceService,
    DueNotificationsWorkerService,
  ],
})
export class NotificationsModule {}
