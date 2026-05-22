import { NotFoundException } from '@nestjs/common';
import type { AuditLogService } from './audit-log.service';
import { AdminUsersService } from './admin-users.service';
import {
  ADMIN_AUDIT_ACTION_USER_UPDATE_NAME,
  ADMIN_AUDIT_RESOURCE_USER,
} from './admin.constants';

describe('AdminUsersService', () => {
  let auditLog: { record: jest.Mock };
  let prisma: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: AdminUsersService;

  beforeEach(() => {
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new AdminUsersService(
      prisma as never,
      auditLog as unknown as AuditLogService,
    );
  });

  it('lists paginated users with optional search filter', async () => {
    const now = new Date();
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prisma.user.count.mockResolvedValueOnce(1);

    const result = await service.listUsers({
      page: 1,
      limit: 20,
      search: 'ada',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: {
          OR: [
            { email: { contains: 'ada', mode: 'insensitive' } },
            { name: { contains: 'ada', mode: 'insensitive' } },
          ],
        },
      }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('getUserById throws when missing', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.getUserById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('patchUserDisplayName updates name and audits', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'target',
      name: 'Old',
    });
    const now = new Date();
    prisma.user.update.mockResolvedValueOnce({
      id: 'target',
      name: 'New',
      email: 't@example.com',
      createdAt: now,
      updatedAt: now,
    });

    const out = await service.patchUserDisplayName('actor', 'target', 'New', {
      ipAddress: '1.2.3.4',
      userAgent: 'jest-test',
    });

    expect(out.name).toBe('New');
    expect(prisma.user.update).toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: 'actor',
      targetUserId: 'target',
      action: ADMIN_AUDIT_ACTION_USER_UPDATE_NAME,
      resourceType: ADMIN_AUDIT_RESOURCE_USER,
      resourceId: 'target',
      metadata: { previousName: 'Old', name: 'New' },
      ipAddress: '1.2.3.4',
      userAgent: 'jest-test',
    });
  });
});
