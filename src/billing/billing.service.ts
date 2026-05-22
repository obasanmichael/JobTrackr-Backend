import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BillingMeResponseDto,
  PlanSummaryDto,
} from './dto/billing-response.dto';
import type { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import type { CustomerPortalDto } from './dto/customer-portal.dto';
import { EntitlementsService } from './entitlements.service';
import { PLAN_CODE_BETA_FREE } from './billing.constants';
import { StripeBillingService } from './stripe-billing.service';
import { SubscriptionProvisioningService } from './subscription-provisioning.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: SubscriptionProvisioningService,
    private readonly entitlements: EntitlementsService,
    private readonly stripeBilling: StripeBillingService,
    private readonly configService: ConfigService,
  ) {}

  async getBillingMe(user: CurrentUser): Promise<BillingMeResponseDto> {
    await this.provisioning.ensureBetaSubscription(user.userId);

    const sub = await this.prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: { plan: true },
    });
    if (!sub) {
      throw new BadRequestException(
        'Subscription row missing after provisioning.',
      );
    }

    const list = await this.entitlements.listEffectiveEntitlements(user.userId);

    return {
      planCode: sub.plan.code,
      planName: sub.plan.name,
      subscriptionStatus: sub.status,
      billingProvider: sub.provider,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      currentPeriodEnd: sub.currentPeriodEnd,
      entitlements: list.map((e) => ({
        featureKey: e.featureKey,
        isEnabled: e.isEnabled,
        limitValue: e.limitValue,
      })),
      stripeConfigured: this.stripeBilling.isConfigured(),
    };
  }

  async listPlans(): Promise<PlanSummaryDto[]> {
    const rows = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    const stripeOn = this.stripeBilling.isConfigured();
    return rows.map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      checkoutAvailable:
        stripeOn &&
        p.code !== PLAN_CODE_BETA_FREE &&
        !!(p.stripePriceId ?? this.hasFallbackStripePrice(p.code)),
      isBeta: p.isBeta,
      sortOrder: p.sortOrder,
    }));
  }

  private hasFallbackStripePrice(planCode: string): boolean {
    const envKey = `STRIPE_PRICE_${planCode}`;
    return Boolean(process.env[envKey]?.trim());
  }

  async createCheckoutSession(
    user: CurrentUser,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string | null }> {
    await this.provisioning.ensureBetaSubscription(user.userId);

    const plan = await this.prisma.plan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan?.isActive) {
      throw new BadRequestException('Unknown or inactive plan.');
    }
    if (plan.code === PLAN_CODE_BETA_FREE) {
      throw new BadRequestException('Checkout is not available for beta-free.');
    }

    const frontend =
      this.configService.get<string>('FRONTEND_URL')?.trim() ??
      'http://localhost:3000';
    const successUrl =
      dto.successUrl ?? `${frontend}/dashboard/billing?checkout=success`;
    const cancelUrl =
      dto.cancelUrl ?? `${frontend}/dashboard/billing?checkout=cancel`;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true },
    });
    if (!dbUser) {
      throw new BadRequestException('User not found.');
    }

    return this.stripeBilling.createCheckoutSession({
      userId: user.userId,
      email: dbUser.email,
      plan,
      successUrl,
      cancelUrl,
    });
  }

  async createPortalSession(
    user: CurrentUser,
    dto: CustomerPortalDto,
  ): Promise<{ url: string }> {
    await this.provisioning.ensureBetaSubscription(user.userId);

    const frontend =
      this.configService.get<string>('FRONTEND_URL')?.trim() ??
      'http://localhost:3000';
    const returnUrl = dto.returnUrl ?? `${frontend}/dashboard/billing`;

    return this.stripeBilling.createPortalSession({
      userId: user.userId,
      returnUrl,
    });
  }
}
