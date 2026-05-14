import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };
    service = new UsersService(prismaService as never);
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.getCurrentUserProfile({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect(profile.id).toBe('user-1');
      expect(profile.email).toBe('test@example.com');
    });

    it('does not expose passwordHash in response payload', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.getCurrentUserProfile({
        userId: 'user-1',
        email: 'test@example.com',
      });

      expect((profile as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });
});
