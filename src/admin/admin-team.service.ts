import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminMembershipStatus, AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_AUDIT_ACTION_TEAM_CREATE,
  ADMIN_AUDIT_ACTION_TEAM_UPDATE,
  ADMIN_AUDIT_RESOURCE_ADMIN_MEMBERSHIP,
} from './admin.constants';
import { AuditLogService } from './audit-log.service';
import type { ClientRequestMeta } from './client-request-meta';
import type {
  AdminTeamMemberDto,
  CreateTeamMemberDto,
  PatchTeamMemberDto,
} from './dto/admin-team.dto';

@Injectable()
export class AdminTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listMembers(): Promise<AdminTeamMemberDto[]> {
    const rows = await this.prisma.adminMembership.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      status: m.status,
      invitedById: m.invitedById,
      user: { email: m.user.email, name: m.user.name },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async createMembership(
    actorUserId: string,
    dto: CreateTeamMemberDto,
    client: ClientRequestMeta,
  ): Promise<AdminTeamMemberDto> {
    const actor = await this.requireActor(actorUserId);
    this.assertCanAssignRole(actor.role, dto.role);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const existing = await this.prisma.adminMembership.findUnique({
      where: { userId: dto.userId },
    });

    let row;
    if (existing) {
      if (existing.status === AdminMembershipStatus.ACTIVE) {
        throw new ConflictException('User already has an active admin membership.');
      }
      row = await this.prisma.adminMembership.update({
        where: { id: existing.id },
        data: {
          role: dto.role,
          status: AdminMembershipStatus.ACTIVE,
          invitedById: actorUserId,
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      });
    } else {
      row = await this.prisma.adminMembership.create({
        data: {
          userId: dto.userId,
          role: dto.role,
          status: AdminMembershipStatus.ACTIVE,
          invitedById: actorUserId,
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      });
    }

    await this.auditLog.record({
      actorUserId,
      targetUserId: dto.userId,
      action: ADMIN_AUDIT_ACTION_TEAM_CREATE,
      resourceType: ADMIN_AUDIT_RESOURCE_ADMIN_MEMBERSHIP,
      resourceId: row.id,
      metadata: { role: dto.role, revived: Boolean(existing) },
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return {
      id: row.id,
      userId: row.userId,
      role: row.role,
      status: row.status,
      invitedById: row.invitedById,
      user: { email: row.user.email, name: row.user.name },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async patchMembership(
    actorUserId: string,
    membershipId: string,
    dto: PatchTeamMemberDto,
    client: ClientRequestMeta,
  ): Promise<AdminTeamMemberDto> {
    if (dto.role === undefined && dto.status === undefined) {
      throw new BadRequestException('Provide role and/or status.');
    }

    const actor = await this.requireActor(actorUserId);

    const current = await this.prisma.adminMembership.findUnique({
      where: { id: membershipId },
    });
    if (!current) {
      throw new NotFoundException('Admin membership not found.');
    }

    if (dto.role !== undefined) {
      this.assertCanAssignRole(actor.role, dto.role);
    }

    const row = await this.prisma.adminMembership.update({
      where: { id: membershipId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    await this.auditLog.record({
      actorUserId,
      targetUserId: row.userId,
      action: ADMIN_AUDIT_ACTION_TEAM_UPDATE,
      resourceType: ADMIN_AUDIT_RESOURCE_ADMIN_MEMBERSHIP,
      resourceId: row.id,
      metadata: {
        previous: {
          role: current.role,
          status: current.status,
        },
        applied: dto,
      },
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return {
      id: row.id,
      userId: row.userId,
      role: row.role,
      status: row.status,
      invitedById: row.invitedById,
      user: { email: row.user.email, name: row.user.name },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async requireActor(userId: string): Promise<{ role: AdminRole }> {
    const m = await this.prisma.adminMembership.findUnique({
      where: { userId },
      select: { role: true, status: true },
    });
    if (!m || m.status !== AdminMembershipStatus.ACTIVE) {
      throw new ForbiddenException('Admin membership required.');
    }
    return { role: m.role };
  }

  private assertCanAssignRole(actorRole: AdminRole, targetRole: AdminRole): void {
    if (
      targetRole === AdminRole.OWNER &&
      actorRole !== AdminRole.OWNER
    ) {
      throw new ForbiddenException('Only OWNER may assign OWNER.');
    }
  }
}
