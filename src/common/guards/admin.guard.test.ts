import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from './admin.guard';
import type { CurrentUser } from '../types/current-user.type';

function mockContext(user?: CurrentUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('AdminGuard', () => {
  it('allows when user id appears in ADMIN_USER_IDS', () => {
    const guard = new AdminGuard({
      get: (key: string) =>
        key === 'ADMIN_USER_IDS'
          ? '11111111-1111-1111-9111-111111111111,22222222-2222-2222-9222-222222222222'
          : undefined,
    } as unknown as ConfigService);

    expect(
      guard.canActivate(
        mockContext({
          userId: '22222222-2222-2222-9222-222222222222',
          email: 'a@b.com',
        }),
      ),
    ).toBe(true);
  });

  it('throws when user id is not listed', () => {
    const guard = new AdminGuard({
      get: (key: string) =>
        key === 'ADMIN_USER_IDS'
          ? '11111111-1111-1111-9111-111111111111'
          : undefined,
    } as unknown as ConfigService);

    expect(() =>
      guard.canActivate(
        mockContext({
          userId: '33333333-3333-3333-9333-333333333333',
          email: 'b@b.com',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws when ADMIN_USER_IDS is empty', () => {
    const guard = new AdminGuard({
      get: (key: string) => (key === 'ADMIN_USER_IDS' ? '' : undefined),
    } as unknown as ConfigService);

    expect(() =>
      guard.canActivate(
        mockContext({
          userId: '11111111-1111-1111-9111-111111111111',
          email: 'x@y.com',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
