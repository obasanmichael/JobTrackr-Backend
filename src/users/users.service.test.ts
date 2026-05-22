import { UsersService } from './users.service';

const configService = {
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      R2_ACCOUNT_ID: 'account-id',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_BUCKET_NAME: 'jobtrackr-avatars',
      R2_PUBLIC_URL: 'https://pub.example.r2.dev',
    };
    return values[key];
  }),
};

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let r2Storage: {
    putObject: jest.Mock;
    deleteObject: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    r2Storage = {
      putObject: jest.fn(),
      deleteObject: jest.fn(),
    };
    service = new UsersService(
      prismaService as never,
      configService as never,
      r2Storage as never,
    );
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentUserProfile', () => {
    it('returns safe user profile for the authenticated user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.getCurrentUserProfile({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect(profile.id).toBe('user-1');
      expect(profile.email).toBe('test@example.com');
      expect(profile.avatarUrl).toBeNull();
    });

    it('does not expose passwordHash in response payload', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.getCurrentUserProfile({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect((profile as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('returns avatarUrl when avatarStorageKey is set', async () => {
      const avatarUpdatedAt = new Date('2026-01-01T00:00:00.000Z');
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: 'avatars/user-1/avatar.webp',
        avatarUpdatedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.getCurrentUserProfile({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect(profile.avatarUrl).toBe(
        `https://pub.example.r2.dev/avatars/user-1/avatar.webp?v=${avatarUpdatedAt.getTime()}`,
      );
    });
  });

  describe('updateCurrentUserProfile', () => {
    it('updates the display name', async () => {
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        timezone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.updateCurrentUserProfile(
        { userId: 'user-1', email: 'test@example.com' },
        { name: 'Updated Name' },
      );

      expect(profile.name).toBe('Updated Name');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('updates the timezone', async () => {
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        timezone: 'America/Chicago',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.updateCurrentUserProfile(
        { userId: 'user-1', email: 'test@example.com' },
        { timezone: 'America/Chicago' },
      );

      expect(profile.timezone).toBe('America/Chicago');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { timezone: 'America/Chicago' },
      });
    });

    it('clears the timezone when null is sent', async () => {
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        avatarStorageKey: null,
        avatarUpdatedAt: null,
        timezone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateCurrentUserProfile(
        { userId: 'user-1', email: 'test@example.com' },
        { timezone: null },
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { timezone: null },
      });
    });
  });
});
