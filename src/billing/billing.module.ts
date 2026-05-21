import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  BillingController,
  BillingPlansController,
  BillingWebhookController,
} from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';
import { StripeBillingService } from './stripe-billing.service';
import { SubscriptionProvisioningService } from './subscription-provisioning.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [
    BillingPlansController,
    BillingController,
    BillingWebhookController,
    EntitlementsController,
  ],
  providers: [
    BillingService,
    EntitlementsService,
    StripeBillingService,
    SubscriptionProvisioningService,
  ],
  exports: [
    BillingService,
    EntitlementsService,
    StripeBillingService,
    SubscriptionProvisioningService,
  ],
})
export class BillingModule {}
