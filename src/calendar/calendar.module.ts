import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { CalendarController } from './calendar.controller';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleCalendarClient } from './google-calendar.client';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [CalendarController],
  providers: [
    CalendarIntegrationsService,
    CalendarSyncService,
    GoogleCalendarClient,
  ],
  exports: [CalendarIntegrationsService, CalendarSyncService],
})
export class CalendarModule {}
