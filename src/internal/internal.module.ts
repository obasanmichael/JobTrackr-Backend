import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronController } from './cron.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [CronController],
})
export class InternalModule {}
