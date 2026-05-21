import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import Stripe from 'stripe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import {
  BillingMeResponseDto,
  PlanSummaryDto,
} from './dto/billing-response.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CustomerPortalDto } from './dto/customer-portal.dto';
import { StripeBillingService } from './stripe-billing.service';

@ApiTags('billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current plan, subscription flags, entitlements' })
  @ApiOkResponse({ type: BillingMeResponseDto })
  me(@CurrentUserDecorator() user: CurrentUser): Promise<BillingMeResponseDto> {
    return this.billingService.getBillingMe(user);
  }

  @Post('create-checkout-session')
  @ApiOperation({
    summary: 'Stripe Checkout session URL for subscribing (test/live keys)',
  })
  @ApiCreatedResponse({
    schema: { properties: { url: { type: 'string', nullable: true } } },
  })
  checkout(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateCheckoutSessionDto,
  ): Promise<{ url: string | null }> {
    return this.billingService.createCheckoutSession(user, body);
  }

  @Post('customer-portal')
  @ApiOperation({ summary: 'Stripe Customer Portal URL' })
  @ApiCreatedResponse({
    schema: { properties: { url: { type: 'string' } } },
  })
  portal(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CustomerPortalDto,
  ): Promise<{ url: string }> {
    return this.billingService.createPortalSession(user, body);
  }
}

@ApiTags('billing')
@Controller('billing')
export class BillingPlansController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Active plans (pricing shell; Stripe price IDs optional)',
  })
  @ApiOkResponse({ type: [PlanSummaryDto] })
  plans(): Promise<PlanSummaryDto[]> {
    return this.billingService.listPlans();
  }
}

@ApiTags('billing')
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly stripeBilling: StripeBillingService) {}

  @Post('webhook')
  @SkipThrottle()
  @ApiOperation({ summary: 'Stripe webhook (no JWT — verified via signature)' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const raw = req.rawBody;
    if (!Buffer.isBuffer(raw)) {
      throw new BadRequestException(
        'Stripe webhook requires rawBody (enable NestFactory.create(..., { rawBody: true })).',
      );
    }

    const event = this.stripeBilling.constructEvent(raw, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          await this.expandAndSyncSubscription(subId);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.stripeBilling.syncSubscriptionFromStripeResource(stripeSub);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async expandAndSyncSubscription(subscriptionId: string): Promise<void> {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      return;
    }
    const stripe = new Stripe(secret);
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    await this.stripeBilling.syncSubscriptionFromStripeResource(stripeSub);
  }
}
