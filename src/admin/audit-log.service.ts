import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecordInput = {
  actorUserId: string;
  targetUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? undefined,
        metadata:
          input.metadata === undefined
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  }
}
