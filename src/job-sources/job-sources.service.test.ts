import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JobSourceType } from '@prisma/client';
import type { JobSource } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { JobSourcesService } from './job-sources.service';

describe('JobSourcesService', () => {
  let service: JobSourcesService;
  let prisma: {
    jobSource: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const baseRow = {
    baseUrl: null,
    isActive: false,
    requiresApiKey: false,
    config: null,
    lastSyncAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  } as const satisfies Partial<JobSource>;

  beforeEach(() => {
    prisma = {
      jobSource: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new JobSourcesService(prisma as unknown as PrismaService);
  });

  it('listForAdmin returns all sources ordered active-first then name', async () => {
    const rows = [
      {
        id: 'a',
        name: 'B',
        type: JobSourceType.MANUAL,
        ...baseRow,
      },
    ] as JobSource[];

    prisma.jobSource.findMany.mockResolvedValueOnce(rows);

    const out = await service.listForAdmin();

    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
    expect(out[0].config).toBeNull();
    expect(prisma.jobSource.findMany).toHaveBeenCalledWith({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  });

  it('createForAdmin passes config JSON', async () => {
    prisma.jobSource.create.mockResolvedValueOnce({
      id: 'new-id',
      name: 'Demo Greenhouse',
      type: JobSourceType.API,
      baseUrl: 'https://boards.greenhouse.io',
      isActive: true,
      requiresApiKey: false,
      config: { board_token: 'acme' },
      lastSyncAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as JobSource);

    await service.createForAdmin({
      name: 'Demo Greenhouse',
      type: JobSourceType.API,
      baseUrl: 'https://boards.greenhouse.io',
      config: { board_token: 'acme' },
    });

    expect(prisma.jobSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Demo Greenhouse',
          type: JobSourceType.API,
          config: { board_token: 'acme' },
        }),
      }),
    );
  });

  it('updateForAdmin 404 when missing', async () => {
    prisma.jobSource.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateForAdmin('00000000-0000-0000-9000-000000000002', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateForAdmin rejects empty body', async () => {
    prisma.jobSource.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-9000-000000000002',
      name: 'X',
      type: JobSourceType.MANUAL,
      ...baseRow,
      isActive: true,
    } as JobSource);

    await expect(
      service.updateForAdmin('00000000-0000-0000-9000-000000000002', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
