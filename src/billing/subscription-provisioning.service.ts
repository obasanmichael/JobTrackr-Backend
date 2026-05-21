import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CODE_BETA_FREE } from './billing.constants';

@Injectable()
export class SubscriptionProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ensures every account has a subscription row (lazy backfill + signup hook). */
  async ensureBetaSubscription(userId: string): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const betaPlan = await this.prisma.plan.findUnique({
      where: { code: PLAN_CODE_BETA_FREE },
      select: { id: true },
    });
    if (!betaPlan) {
      throw new Error(
        `Plan ${PLAN_CODE_BETA_FREE} is missing — run prisma migrations.`,
      );
    }

    await this.prisma.subscription.create({
      data: {
        userId,
        planId: betaPlan.id,
      },
    });
  }
}
