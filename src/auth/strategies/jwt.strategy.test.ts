import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps JWT payload to CurrentUser shape', () => {
    const configService = {
      get: (key: string) => {
        switch (key) {
          case 'JWT_ACCESS_SECRET':
            return 'test-secret';
          case 'JWT_ACCESS_EXPIRES_IN':
            return '15m';
          default:
            return undefined;
        }
      },
    } as ConfigService;

    const strategy = new JwtStrategy(configService);
    const user = strategy.validate({
      sub: 'user-123',
      email: 'candidate@example.com',
    });

    expect(user).toEqual({
      userId: 'user-123',
      email: 'candidate@example.com',
    });
  });
});
