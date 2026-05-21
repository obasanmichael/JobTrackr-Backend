import { ForbiddenException, Injectable } from '@nestjs/common';
import type { FeatureEntitlement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALL_FEATURE_KEYS,
  type FeatureKey,
} from './billing.constants';

export type EffectiveEntitlement = {
  featureKey: FeatureKey;
  isEnabled: boolean;
  limitValue: number | null;
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEffectiveEntitlements(userId: string): Promise<EffectiveEntitlement[]> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: { featureEntitlements: true },
        },
      },
    });
    if (!sub) {
      return ALL_FEATURE_KEYS.map((featureKey) => ({
        featureKey,
        isEnabled: false,
        limitValue: null,
      }));
    }

    const byKey = new Map<string, FeatureEntitlement>(
      sub.plan.featureEntitlements.map((row) => [row.featureKey, row]),
    );

    return ALL_FEATURE_KEYS.map((featureKey) => {
      const row = byKey.get(featureKey);
      return {
        featureKey,
        isEnabled: row?.isEnabled ?? false,
        limitValue: row?.limitValue ?? null,
      };
    });
  }

  async assertFeatureEnabled(userId: string, featureKey: FeatureKey): Promise<void> {
    const list = await this.listEffectiveEntitlements(userId);
    const hit = list.find((e) => e.featureKey === featureKey);
    if (!hit?.isEnabled) {
      throw new ForbiddenException(
        `Feature "${featureKey}" is not enabled for your plan.`,
      );
    }
  }

  async getEntitlementRow(
    userId: string,
    featureKey: FeatureKey,
  ): Promise<EffectiveEntitlement | undefined> {
    const list = await this.listEffectiveEntitlements(userId);
    return list.find((e) => e.featureKey === featureKey);
  }
}
