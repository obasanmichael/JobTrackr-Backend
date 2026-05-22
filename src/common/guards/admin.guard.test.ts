import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from './admin.guard';
import type { CurrentUser } from '../types/current-user.type';
import type { PrismaService } from '../../prisma/prisma.service';

function mockContext(user?: CurrentUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

function mockPrisma(membership: { status: string } | null): PrismaService {
  return {
    adminMembership: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
  } as unknown as PrismaService;
}

describe('AdminGuard', () => {
  const user = {
    userId: '22222222-2222-2222-9222-222222222222',
    email: 'a@b.com',
  } satisfies CurrentUser;

  it('allows when user id appears in ADMIN_USER_IDS (skip DB)', async () => {
    const prismaStub = mockPrisma(null);

    const guard = new AdminGuard(
      {
        get: (key: string) =>
          key === 'ADMIN_USER_IDS'
            ? '11111111-1111-1111-9111-111111111111,22222222-2222-2222-9222-222222222222'
            : undefined,
      } as unknown as ConfigService,
      prismaStub,
    );

    await expect(guard.canActivate(mockContext(user))).resolves.toBe(true);
    expect(prismaStub.adminMembership.findUnique).not.toHaveBeenCalled();
  });

  it('calls DB when env list misses and allows ACTIVE membership', async () => {
    const prismaStub = mockPrisma({ status: 'ACTIVE' });

    const guard = new AdminGuard(
      {
        get: (key: string) =>
          key === 'ADMIN_USER_IDS'
            ? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
            : undefined,
      } as unknown as ConfigService,
      prismaStub,
    );

    await expect(guard.canActivate(mockContext(user))).resolves.toBe(true);
    expect(prismaStub.adminMembership.findUnique).toHaveBeenCalledWith({
      where: { userId: user.userId },
      select: { status: true },
    });
  });

  it('forbids when user id is not listed and membership missing', async () => {
    const guard = new AdminGuard(
      {
        get: (key: string) =>
          key === 'ADMIN_USER_IDS'
            ? '11111111-1111-1111-9111-111111111111'
            : undefined,
      } as unknown as ConfigService,
      mockPrisma(null),
    );

    await expect(guard.canActivate(mockContext(user))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('forbids when ADMIN_USER_IDS is empty and membership is REVOKED', async () => {
    const prismaStub = mockPrisma({ status: 'REVOKED' });

    const guard = new AdminGuard(
      {
        get: (key: string) => (key === 'ADMIN_USER_IDS' ? '' : undefined),
      } as unknown as ConfigService,
      prismaStub,
    );

    await expect(guard.canActivate(mockContext(user))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
