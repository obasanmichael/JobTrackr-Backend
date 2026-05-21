import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingProvider,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_AUDIT_ACTION_SUBSCRIPTION_OVERRIDE,
  ADMIN_AUDIT_RESOURCE_SUBSCRIPTION,
} from './admin.constants';
import { AuditLogService } from './audit-log.service';
import type { ClientRequestMeta } from './client-request-meta';
import type { AdminSubscriptionListQueryDto } from './dto/admin-subscription-list-query.dto';
import type {
  AdminSubscriptionRowDto,
  AdminSubscriptionsPageResponseDto,
} from './dto/admin-subscription-response.dto';
import type { PatchAdminSubscriptionDto } from './dto/patch-admin-subscription.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(
    query: AdminSubscriptionListQueryDto,
  ): Promise<AdminSubscriptionsPageResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where =
      search && search.length > 0
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { name: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          user: { select: { id: true, email: true, name: true } },
          plan: { select: { code: true, name: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const items: AdminSubscriptionRowDto[] = rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: {
        id: s.user.id,
        email: s.user.email,
        name: s.user.name,
      },
      plan: { code: s.plan.code, name: s.plan.name },
      status: s.status,
      billingProvider: s.provider,
      stripeCustomerId: s.stripeCustomerId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async patchSubscription(
    actorUserId: string,
    targetUserId: string,
    dto: PatchAdminSubscriptionDto,
    client: ClientRequestMeta,
  ): Promise<AdminSubscriptionRowDto> {
    if (dto.planCode === undefined && dto.status === undefined) {
      throw new BadRequestException('Provide planCode and/or status.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { userId: targetUserId },
      include: { plan: true },
    });

    let planId = existing?.planId;
    if (dto.planCode !== undefined) {
      const plan = await this.prisma.plan.findFirst({
        where: { code: dto.planCode, isActive: true },
      });
      if (!plan) {
        throw new BadRequestException('Unknown or inactive plan code.');
      }
      planId = plan.id;
    }

    if (!existing && planId === undefined) {
      throw new BadRequestException(
        'planCode is required when the user has no subscription row.',
      );
    }

    const previous = existing
      ? { planCode: existing.plan.code, status: existing.status as string }
      : null;

    const row =
      existing
        ? await this.prisma.subscription.update({
            where: { userId: targetUserId },
            data: {
              ...(planId !== undefined && { planId }),
              ...(dto.status !== undefined && { status: dto.status }),
            },
            include: {
              user: { select: { id: true, email: true, name: true } },
              plan: { select: { code: true, name: true } },
            },
          })
        : await this.prisma.subscription.create({
            data: {
              userId: targetUserId,
              planId: planId!,
              status: dto.status ?? SubscriptionStatus.BETA,
              provider: BillingProvider.NONE,
            },
            include: {
              user: { select: { id: true, email: true, name: true } },
              plan: { select: { code: true, name: true } },
            },
          });

    await this.auditLog.record({
      actorUserId,
      targetUserId,
      action: ADMIN_AUDIT_ACTION_SUBSCRIPTION_OVERRIDE,
      resourceType: ADMIN_AUDIT_RESOURCE_SUBSCRIPTION,
      resourceId: row.id,
      metadata: {
        previous,
        applied: {
          planCode: dto.planCode ?? row.plan.code,
          status: dto.status ?? row.status,
        },
      },
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return {
      id: row.id,
      userId: row.userId,
      user: {
        id: row.user.id,
        email: row.user.email,
        name: row.user.name,
      },
      plan: { code: row.plan.code, name: row.plan.name },
      status: row.status,
      billingProvider: row.provider,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
