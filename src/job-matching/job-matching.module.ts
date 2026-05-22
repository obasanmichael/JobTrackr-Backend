import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchAlertPreferencesController } from './match-alert-preferences.controller';
import { MatchAlertDeliveryService } from './match-alert-delivery.service';
import { MatchAlertPreferenceService } from './match-alert-preference.service';
import { JobMatchingService } from './job-matching.service';
import { MatchesController } from './matches.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [MatchesController, MatchAlertPreferencesController],
  providers: [
    JobMatchingService,
    MatchAlertPreferenceService,
    MatchAlertDeliveryService,
  ],
  exports: [
    JobMatchingService,
    MatchAlertPreferenceService,
    MatchAlertDeliveryService,
  ],
})
export class JobMatchingModule {}
