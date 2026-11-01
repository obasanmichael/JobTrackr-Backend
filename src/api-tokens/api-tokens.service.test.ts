import { NotFoundException } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';

describe('ApiTokensService', () => {
  const user = { userId: 'user-1', email: 'user@example.com' };
  let service: ApiTokensService;
  let prisma: {
    apiToken: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      apiToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
      },
    };
    service = new ApiTokensService(prisma as never);
  });

  it('returns the plaintext once and stores only its hash', async () => {
    prisma.apiToken.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'tok-1',
        lastUsedAt: null,
        createdAt: new Date(),
        ...data,
      }),
    );

    const result = await service.create(user, { name: 'Claude' });

    expect(result.token).toMatch(/^jt_[A-Za-z0-9_-]{43}$/);
    const stored = prisma.apiToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenHash).not.toContain(result.token);
    expect(stored.prefix).toBe(result.token.slice(0, 10));
    expect(stored.userId).toBe('user-1');
    expect(stored.expiresAt).toBeNull();
    expect(JSON.stringify(result)).not.toContain(stored.tokenHash);
  });

  it('sets expiresAt when expiresInDays is given', async () => {
    prisma.apiToken.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'tok-1',
        lastUsedAt: null,
        createdAt: new Date(),
        ...data,
      }),
    );

    await service.create(user, { name: 'Claude', expiresInDays: 30 });

    const { expiresAt } = prisma.apiToken.create.mock.calls[0][0].data;
    const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('revoke is scoped to the owner and 404s when nothing matched', async () => {
    prisma.apiToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.revoke(user, 'tok-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.apiToken.updateMany.mock.calls[0][0].where).toEqual({
      id: 'tok-x',
      userId: 'user-1',
      revokedAt: null,
    });
  });

  describe('authenticate', () => {
    const record = (overrides = {}) => ({
      id: 'tok-1',
      revokedAt: null,
      expiresAt: null,
      lastUsedAt: new Date(),
      user: { id: 'user-1', email: 'user@example.com' },
      ...overrides,
    });

    it('rejects tokens without the jt_ prefix without hitting the DB', async () => {
      await expect(service.authenticate('eyJ.jwt.token')).resolves.toBeNull();
      expect(prisma.apiToken.findUnique).not.toHaveBeenCalled();
    });

    it('resolves a valid token to its owner', async () => {
      prisma.apiToken.findUnique.mockResolvedValue(record());

      await expect(service.authenticate('jt_abc')).resolves.toEqual(user);
    });

    it.each([
      ['unknown', null],
      ['revoked', record({ revokedAt: new Date() })],
      ['expired', record({ expiresAt: new Date(Date.now() - 1000) })],
    ])('rejects %s tokens', async (_label, row) => {
      prisma.apiToken.findUnique.mockResolvedValue(row);

      await expect(service.authenticate('jt_abc')).resolves.toBeNull();
    });

    it('refreshes lastUsedAt only when stale', async () => {
      prisma.apiToken.findUnique.mockResolvedValueOnce(record());
      await service.authenticate('jt_abc');
      expect(prisma.apiToken.update).not.toHaveBeenCalled();

      prisma.apiToken.findUnique.mockResolvedValueOnce(
        record({ lastUsedAt: null }),
      );
      await service.authenticate('jt_abc');
      expect(prisma.apiToken.update).toHaveBeenCalledTimes(1);
    });
  });
});
