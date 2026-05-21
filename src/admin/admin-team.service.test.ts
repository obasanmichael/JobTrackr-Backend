import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AdminMembershipStatus, AdminRole } from '@prisma/client';
import type { AuditLogService } from './audit-log.service';
import { AdminTeamService } from './admin-team.service';
import { ADMIN_AUDIT_ACTION_TEAM_CREATE } from './admin.constants';

describe('AdminTeamService', () => {
  let auditLog: { record: jest.Mock };
  let prisma: {
    adminMembership: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let service: AdminTeamService;

  beforeEach(() => {
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      adminMembership: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    service = new AdminTeamService(
      prisma as never,
      auditLog as unknown as AuditLogService,
    );
  });

  it('createMembership forbids OWNER grant by non-OWNER', async () => {
    prisma.adminMembership.findUnique.mockResolvedValueOnce({
      role: AdminRole.ADMIN,
      status: AdminMembershipStatus.ACTIVE,
    });

    await expect(
      service.createMembership(
        'actor',
        { userId: 'u-target', role: AdminRole.OWNER },
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('createMembership conflicts when ACTIVE membership exists', async () => {
    prisma.adminMembership.findUnique
      .mockResolvedValueOnce({
        role: AdminRole.ADMIN,
        status: AdminMembershipStatus.ACTIVE,
      })
      .mockResolvedValueOnce({
        id: 'm1',
        userId: 'u-target',
        status: AdminMembershipStatus.ACTIVE,
        role: AdminRole.ADMIN,
      });

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-target' });

    await expect(
      service.createMembership(
        'actor',
        { userId: 'u-target', role: AdminRole.SUPPORT },
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('createMembership inserts and audits for new row', async () => {
    prisma.adminMembership.findUnique
      .mockResolvedValueOnce({
        role: AdminRole.OWNER,
        status: AdminMembershipStatus.ACTIVE,
      })
      .mockResolvedValueOnce(null);

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-new' });
    const now = new Date();
    prisma.adminMembership.create.mockResolvedValueOnce({
      id: 'mem-1',
      userId: 'u-new',
      role: AdminRole.SUPPORT,
      status: AdminMembershipStatus.ACTIVE,
      invitedById: 'actor',
      createdAt: now,
      updatedAt: now,
      user: { email: 'n@b.com', name: 'N' },
    });

    await service.createMembership(
      'actor',
      { userId: 'u-new', role: AdminRole.SUPPORT },
      {},
    );

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ADMIN_AUDIT_ACTION_TEAM_CREATE,
      }),
    );
  });
});
