import { NotFoundException } from '@nestjs/common';
import { BillingProvider, SubscriptionStatus } from '@prisma/client';
import type { AuditLogService } from './audit-log.service';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { ADMIN_AUDIT_ACTION_SUBSCRIPTION_OVERRIDE } from './admin.constants';

describe('AdminSubscriptionsService', () => {
  let auditLog: { record: jest.Mock };
  let prisma: {
    subscription: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    plan: { findFirst: jest.Mock };
  };
  let service: AdminSubscriptionsService;

  beforeEach(() => {
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      subscription: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      plan: { findFirst: jest.fn() },
    };
    service = new AdminSubscriptionsService(
      prisma as never,
      auditLog as unknown as AuditLogService,
    );
  });

  it('lists subscriptions with search filter', async () => {
    const now = new Date();
    prisma.subscription.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        userId: 'u1',
        status: 'BETA',
        provider: 'NONE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: now,
        updatedAt: now,
        user: { id: 'u1', email: 'a@b.com', name: 'A' },
        plan: { code: 'BETA_FREE', name: 'Beta' },
      },
    ]);
    prisma.subscription.count.mockResolvedValueOnce(1);

    const out = await service.list({
      page: 1,
      limit: 20,
      search: 'a@',
    });

    expect(out.total).toBe(1);
    expect(out.items[0].plan.code).toBe('BETA_FREE');
  });

  it('patchSubscription updates existing row and audits', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
    prisma.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      planId: 'p-old',
      plan: { code: 'FREE', name: 'Free' },
      status: SubscriptionStatus.BETA,
    });
    prisma.plan.findFirst.mockResolvedValueOnce({
      id: 'p-new',
      code: 'PRO',
      isActive: true,
    });
    const now = new Date();
    prisma.subscription.update.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'u1',
      status: SubscriptionStatus.ACTIVE,
      provider: BillingProvider.NONE,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: now,
      updatedAt: now,
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
      plan: { code: 'PRO', name: 'Pro' },
    });

    await service.patchSubscription(
      'actor',
      'u1',
      { planCode: 'PRO', status: SubscriptionStatus.ACTIVE },
      {},
    );

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ADMIN_AUDIT_ACTION_SUBSCRIPTION_OVERRIDE,
        targetUserId: 'u1',
      }),
    );
  });

  it('patchSubscription throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.patchSubscription('actor', 'missing', { planCode: 'PRO' }, {}),
    ).rejects.toThrow(NotFoundException);
  });
});
