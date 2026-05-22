import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { DueNotificationsWorkerService } from './due-notifications.worker.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, EmailModule],
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
