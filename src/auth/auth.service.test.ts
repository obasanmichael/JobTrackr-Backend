import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashResetToken } from './password-reset-token.util';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: ConfigService;
  let subscriptionProvisioning: { ensureBetaSubscription: jest.Mock };
  let emailService: { sendPasswordResetEmail: jest.Mock };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg(prismaService);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
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
          case 'FRONTEND_URL':
            return 'http://localhost:3000';
          case 'PASSWORD_RESET_TTL_HOURS':
            return '1';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    subscriptionProvisioning = {
      ensureBetaSubscription: jest.fn().mockResolvedValue(undefined),
    };

    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prismaService as never,
      jwtService as unknown as JwtService,
      configService,
      subscriptionProvisioning as never,
      emailService as never,
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
        avatarStorageKey: null,
        avatarUpdatedAt: null,
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
      expect(subscriptionProvisioning.ensureBetaSubscription).toHaveBeenCalledWith(
        'user-1',
      );
      expect(
        (response.user as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
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
  });

  describe('login', () => {
    it('logs in with valid credentials and returns access token', async () => {
      const hash = await service['hashPassword']('StrongPassword123');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: hash,
        avatarStorageKey: null,
        avatarUpdatedAt: null,
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
  });

  describe('changePassword', () => {
    it('updates password when current password is valid', async () => {
      const hash = await service['hashPassword']('CurrentPassword123');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
      });
      prismaService.user.update.mockResolvedValue({});
      prismaService.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      const response = await service.changePassword(
        { userId: 'user-1', email: 'test@example.com' },
        {
          currentPassword: 'CurrentPassword123',
          newPassword: 'NewPassword456',
        },
      );

      expect(response.message).toBe('Password updated successfully.');
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('rejects incorrect current password', async () => {
      const hash = await service['hashPassword']('CurrentPassword123');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      await expect(
        service.changePassword(
          { userId: 'user-1', email: 'test@example.com' },
          {
            currentPassword: 'WrongPassword123',
            newPassword: 'NewPassword456',
          },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('returns generic success even when email is unknown', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const response = await service.forgotPassword({
        email: 'unknown@example.com',
      });

      expect(response.message).toContain('If an account exists');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates reset token and sends email for known user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });
      prismaService.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      const response = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(response.message).toContain('If an account exists');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('rejects invalid token', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'a'.repeat(64),
          newPassword: 'BrandNewPassword1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('resets password and returns auth response for valid token', async () => {
      const rawToken = 'b'.repeat(64);
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'old-hash',
          avatarStorageKey: null,
          avatarUpdatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      prismaService.passwordResetToken.update.mockResolvedValue({});
      prismaService.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'new-hash',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.resetPassword({
        token: rawToken,
        newPassword: 'BrandNewPassword1',
      });

      expect(response.accessToken).toBe('signed-jwt-token');
      expect(response.user.email).toBe('test@example.com');
    });
  });
});
