import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_AI_RESUME_REVIEW } from '../billing/billing.constants';
import { EntitlementsService } from '../billing/entitlements.service';
import { utcMonthPeriodKey } from './resume-review-quota.util';

@Injectable()
export class ResumeReviewQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  /** Successful completions only (§7.3); failures do not consume quota. */
  async ensureMonthlyAiResumeReviewBudget(userId: string): Promise<void> {
    await this.entitlementsService.assertFeatureEnabled(
      userId,
      FEATURE_AI_RESUME_REVIEW,
    );

    const entitlement = await this.entitlementsService.getEntitlementRow(
      userId,
      FEATURE_AI_RESUME_REVIEW,
    );

    const limit = ResumeReviewQuotaService.resolveMonthlySuccessLimit(
      this.configService.get<string>('AI_RESUME_REVIEW_MONTHLY_LIMIT'),
      entitlement?.limitValue,
    );
    if (limit === null) {
      return;
    }

    const periodKey = utcMonthPeriodKey();
    const row = await this.prisma.usageCounter.findUnique({
      where: {
        userId_featureKey_periodKey: {
          userId,
          featureKey: FEATURE_AI_RESUME_REVIEW,
          periodKey,
        },
      },
    });

    if ((row?.count ?? 0) >= limit) {
      throw new ForbiddenException(
        'Monthly AI resume review limit reached for your account.',
      );
    }
  }

  async recordSuccessfulAiResumeReview(
    userId: string,
    db: Pick<PrismaService, 'usageCounter'> = this.prisma,
  ): Promise<void> {
    const entitlement = await this.entitlementsService.getEntitlementRow(
      userId,
      FEATURE_AI_RESUME_REVIEW,
    );
    const limit = ResumeReviewQuotaService.resolveMonthlySuccessLimit(
      this.configService.get<string>('AI_RESUME_REVIEW_MONTHLY_LIMIT'),
      entitlement?.limitValue,
    );
    if (limit === null) {
      return;
    }

    const periodKey = utcMonthPeriodKey();

    await db.usageCounter.upsert({
      where: {
        userId_featureKey_periodKey: {
          userId,
          featureKey: FEATURE_AI_RESUME_REVIEW,
          periodKey,
        },
      },
      create: {
        userId,
        featureKey: FEATURE_AI_RESUME_REVIEW,
        periodKey,
        count: 1,
        limitValue: limit,
      },
      update: {
        count: { increment: 1 },
        limitValue: limit,
      },
    });
  }

  /** `-1`, `unlimited`, blank → no cap; positive digits → max successful reviews per UTC month. */
  static resolveMonthlySuccessLimit(
    rawConfig: string | undefined,
    entitlementLimit: number | null | undefined,
  ): number | null {
    if (typeof entitlementLimit === 'number' && entitlementLimit >= 0) {
      return entitlementLimit;
    }

    const raw = rawConfig?.trim();
    if (!raw || raw === '-1') {
      return null;
    }

    const normalized = raw.toLowerCase();
    if (normalized === 'unlimited') {
      return null;
    }

    if (!/^[1-9]\d*$/.test(raw)) {
      return null;
    }

    return Number(raw);
  }
}
