import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: ConfigService;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };
    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_ACCESS_SECRET':
            return 'test-secret';
          case 'JWT_ACCESS_EXPIRES_IN':
            return '15m';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    service = new AuthService(
      prismaService as never,
      jwtService as unknown as JwtService,
      configService,
    );
  });

  describe('register', () => {
    it('registers a new user and returns safe profile with access token', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const response = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPassword123',
      });

      expect(response.accessToken).toBe('signed-jwt-token');
      expect(response.user.email).toBe('test@example.com');
      expect((response.user as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('rejects duplicate email with a safe conflict response', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(
        service.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'StrongPassword123',
        }),
      ).rejects.toThrow('An account with this email already exists.');
    });

    it('stores password hash only and never plaintext password', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPassword123',
      });

      expect(prismaService.user.create).toHaveBeenCalled();
      const createPayload = prismaService.user.create.mock.calls[0][0] as {
        data: { passwordHash: string; password?: string };
      };
      expect(createPayload.data.passwordHash).toBeDefined();
      expect(createPayload.data.passwordHash).not.toBe('StrongPassword123');
      expect(createPayload.data.password).toBeUndefined();
    });
  });

  describe('login', () => {
    it('logs in with valid credentials and returns access token', async () => {
      const hash = await service['hashPassword']('StrongPassword123');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.login({
        email: 'test@example.com',
        password: 'StrongPassword123',
      });

      expect(response.accessToken).toBe('signed-jwt-token');
      expect(response.user.email).toBe('test@example.com');
    });

    it('rejects invalid password with generic invalid credentials message', async () => {
      const hash = await service['hashPassword']('CorrectPassword123');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('returns generic invalid credentials when user email is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'StrongPassword123',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('me', () => {
    it('returns safe current user profile without passwordHash', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.getMe({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect(response.email).toBe('test@example.com');
      expect((response as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('password helpers', () => {
    it('hashes and verifies password with argon2', async () => {
      const plainText = 'StrongPassword123';
      const hash = await service['hashPassword'](plainText);

      expect(hash).not.toBe(plainText);
      await expect(service['verifyPassword'](hash, plainText)).resolves.toBe(
        true,
      );
      await expect(service['verifyPassword'](hash, 'wrong-password')).resolves.toBe(
        false,
      );
    });
  });
});
