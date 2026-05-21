import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingProvider, type Plan, type SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLAN_CODE_PRO,
  PLAN_CODE_PREMIUM,
} from './billing.constants';

@Injectable()
export class StripeBillingService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('STRIPE_SECRET_KEY')?.trim();
    this.stripe = secret ? new Stripe(secret) : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  constructEvent(payload: Buffer, signature: string | undefined): Stripe.Event {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not set.');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header.');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  async createCheckoutSession(params: {
    userId: string;
    email: string;
    plan: Plan;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string | null }> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }

    const priceId =
      params.plan.stripePriceId ??
      this.resolveFallbackStripePrice(params.plan.code);
    if (!priceId) {
      throw new BadRequestException(
        `No Stripe price configured for plan ${params.plan.code}. Set Plan.stripePriceId or STRIPE_PRICE_${params.plan.code}.`,
      );
    }

    let customerId = await this.findStripeCustomerId(params.userId);
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: params.email,
        metadata: { userId: params.userId },
      });
      customerId = customer.id;
      await this.prisma.subscription.updateMany({
        where: { userId: params.userId },
        data: { stripeCustomerId: customerId, provider: BillingProvider.STRIPE },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        planCode: params.plan.code,
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          planCode: params.plan.code,
        },
      },
    });

    return { url: session.url };
  }

  async createPortalSession(params: {
    userId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }
    const customerId = await this.findStripeCustomerId(params.userId);
    if (!customerId) {
      throw new BadRequestException(
        'No Stripe customer on file — complete checkout first.',
      );
    }
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: params.returnUrl,
    });
    return { url: portal.url };
  }

  private resolveFallbackStripePrice(planCode: string): string | undefined {
    const key = `STRIPE_PRICE_${planCode}`;
    const fromEnv = process.env[key]?.trim();
    if (fromEnv) {
      return fromEnv;
    }
    if (planCode === PLAN_CODE_PRO) {
      return process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
    }
    if (planCode === PLAN_CODE_PREMIUM) {
      return process.env.STRIPE_PRICE_PREMIUM_MONTHLY?.trim();
    }
    return undefined;
  }

  private async findStripeCustomerId(userId: string): Promise<string | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });
    return row?.stripeCustomerId ?? null;
  }

  async syncSubscriptionFromStripeResource(
    stripeSub: Stripe.Subscription,
    fallbackUserId?: string,
  ): Promise<void> {
    const userId =
      stripeSub.metadata?.userId ?? fallbackUserId ?? undefined;
    if (!userId) {
      return;
    }

    const planCode =
      stripeSub.metadata?.planCode ??
      (await this.resolvePlanCodeFromStripeSubscription(stripeSub));

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode ?? '__missing__' },
    });
    if (!plan) {
      return;
    }

    const status = StripeBillingService.mapStripeStatus(stripeSub.status);
    const cust =
      typeof stripeSub.customer === 'string'
        ? stripeSub.customer
        : stripeSub.customer?.id;

    const periods = StripeBillingService.subscriptionPeriodBounds(stripeSub);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status,
        provider: BillingProvider.STRIPE,
        stripeCustomerId: cust ?? undefined,
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart: periods.start,
        currentPeriodEnd: periods.end,
        cancelAt: stripeSub.cancel_at
          ? StripeBillingService.secToDate(stripeSub.cancel_at)
          : null,
      },
      update: {
        planId: plan.id,
        status,
        provider: BillingProvider.STRIPE,
        stripeCustomerId: cust ?? undefined,
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart: periods.start,
        currentPeriodEnd: periods.end,
        cancelAt: stripeSub.cancel_at
          ? StripeBillingService.secToDate(stripeSub.cancel_at)
          : null,
      },
    });
  }

  private static subscriptionPeriodBounds(stripeSub: Stripe.Subscription): {
    start: Date | null;
    end: Date | null;
  } {
    const item = stripeSub.items?.data?.[0];
    if (!item?.current_period_start || !item?.current_period_end) {
      return { start: null, end: null };
    }
    return {
      start: StripeBillingService.secToDate(item.current_period_start),
      end: StripeBillingService.secToDate(item.current_period_end),
    };
  }

  private async resolvePlanCodeFromStripeSubscription(
    stripeSub: Stripe.Subscription,
  ): Promise<string | undefined> {
    const item = stripeSub.items?.data?.[0];
    const priceId = item?.price?.id;
    if (!priceId) {
      return undefined;
    }
    const plan = await this.prisma.plan.findFirst({
      where: { stripePriceId: priceId },
      select: { code: true },
    });
    return plan?.code;
  }

  private static secToDate(sec: number): Date {
    return new Date(sec * 1000);
  }

  static mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'trialing':
        return 'TRIALING';
      case 'past_due':
      case 'unpaid':
        return 'PAST_DUE';
      case 'canceled':
      case 'paused':
        return 'CANCELLED';
      case 'incomplete':
      case 'incomplete_expired':
        return status === 'incomplete_expired' ? 'EXPIRED' : 'TRIALING';
      default:
        return 'ACTIVE';
    }
  }
}
