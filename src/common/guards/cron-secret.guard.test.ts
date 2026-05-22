import { UnauthorizedException } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';

describe('CronSecretGuard', () => {
  const configService = {
    get: jest.fn((key: string) => (key === 'CRON_SECRET' ? 'cron-secret' : undefined)),
  };

  it('allows matching bearer secret', () => {
    const guard = new CronSecretGuard(configService as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer cron-secret' },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows raw authorization header without Bearer prefix', () => {
    const guard = new CronSecretGuard(configService as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'cron-secret' },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows x-cron-secret header', () => {
    const guard = new CronSecretGuard(configService as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-cron-secret': 'cron-secret' },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('rejects invalid secret', () => {
    const guard = new CronSecretGuard(configService as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer wrong' },
        }),
      }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
  });
});
