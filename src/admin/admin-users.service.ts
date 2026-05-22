import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_AUDIT_ACTION_USER_UPDATE_NAME,
  ADMIN_AUDIT_RESOURCE_USER,
} from './admin.constants';
import { AuditLogService } from './audit-log.service';
import type { ClientRequestMeta } from './client-request-meta';
import type { AdminUserListQueryDto } from './dto/admin-user-list-query.dto';
import type {
  AdminUserDetailDto,
  AdminUsersPageResponseDto,
  AdminUserSummaryDto,
} from './dto/admin-user-response.dto';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listUsers(
    query: AdminUserListQueryDto,
  ): Promise<AdminUsersPageResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where =
      search && search.length > 0
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: userListSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const items: AdminUserSummaryDto[] = rows.map((u) => ({ ...u }));

    return {
      items,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getUserById(userId: string): Promise<AdminUserDetailDto> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userListSelect,
        subscription: {
          select: {
            status: true,
            provider: true,
            plan: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('User not found.');
    }

    const { subscription: subRaw, ...userCore } = row;

    let subscription: AdminUserDetailDto['subscription'] = null;
    if (subRaw?.plan) {
      subscription = {
        status: subRaw.status,
        billingProvider: subRaw.provider,
        planCode: subRaw.plan.code,
        planName: subRaw.plan.name,
      };
    }

    return { ...userCore, subscription };
  }

  async patchUserDisplayName(
    actorUserId: string,
    targetUserId: string,
    name: string,
    client: ClientRequestMeta,
  ): Promise<AdminUserSummaryDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    const prevName = existing.name;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { name },
      select: userListSelect,
    });

    await this.auditLog.record({
      actorUserId,
      targetUserId,
      action: ADMIN_AUDIT_ACTION_USER_UPDATE_NAME,
      resourceType: ADMIN_AUDIT_RESOURCE_USER,
      resourceId: targetUserId,
      metadata: { previousName: prevName, name },
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return { ...updated };
  }
}
