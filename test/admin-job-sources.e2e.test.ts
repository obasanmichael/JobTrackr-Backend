import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JobSourceType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { JOB_SOURCE_SYNC_PORT } from '../src/job-sources/sync/job-source-sync.tokens';
import type { JobSourceSyncPort } from '../src/job-sources/sync/job-source-sync.port';

describe('Admin job sources (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let fetchSnapshot: jest.Mock;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Admin Operator',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    return {
      accessToken: response.body.accessToken as string,
    };
  };

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    fetchSnapshot = jest.fn();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: { userId: string } } };
        }) => {
          const user = ctx.switchToHttp().getRequest().user;
          if (!user?.userId) {
            throw new UnauthorizedException();
          }
          return true;
        },
      })
      .overrideProvider(JOB_SOURCE_SYNC_PORT)
      .useValue({
        fetchSnapshot,
      } satisfies Pick<JobSourceSyncPort, 'fetchSnapshot'>)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prismaService = app.get(PrismaService);
  });

  beforeEach(async () => {
    fetchSnapshot.mockReset();
    await prismaService.externalJob.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.externalJob.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('lists job sources with health fields for admin', async () => {
    const { accessToken } = await registerUser(
      `admin-list-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Health Demo',
        type: JobSourceType.API,
        isActive: true,
        lastErrorMessage: 'previous failure',
        consecutiveSyncFailures: 2,
      },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/job-sources')
      .set(authHeader(accessToken))
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(source.id);
    expect(listResponse.body[0].name).toBe('Health Demo');
    expect(listResponse.body[0].lastErrorMessage).toBe('previous failure');
    expect(listResponse.body[0].consecutiveSyncFailures).toBe(2);
  });

  it('syncs a job source via admin endpoint and clears lastError on success', async () => {
    const { accessToken } = await registerUser(
      `admin-sync-ok-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Sync Demo',
        type: JobSourceType.ATS_FEED,
        isActive: true,
        lastErrorMessage: 'old failure',
        consecutiveSyncFailures: 2,
      },
    });

    fetchSnapshot.mockResolvedValueOnce({
      rawListings: [
        {
          externalJobId: 'sync-1',
          title: 'Platform Engineer',
          company: 'Sync Co',
          applicationUrl: 'https://jobs.example/sync-1',
        },
      ],
    });

    const syncResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/job-sources/${source.id}/sync`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(syncResponse.body.jobSourceId).toBe(source.id);
    expect(syncResponse.body.upsertedCount).toBe(1);
    expect(syncResponse.body.skippedInvalid).toBe(0);

    const updated = await prismaService.jobSource.findUnique({
      where: { id: source.id },
    });
    expect(updated?.lastErrorAt).toBeNull();
    expect(updated?.lastErrorMessage).toBeNull();
    expect(updated?.lastSuccessAt).toBeInstanceOf(Date);
    expect(updated?.consecutiveSyncFailures).toBe(0);

    const jobs = await prismaService.externalJob.findMany({
      where: { sourceId: source.id },
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.title).toBe('Platform Engineer');
  });

  it('persists lastError fields when admin sync fails', async () => {
    const { accessToken } = await registerUser(
      `admin-sync-fail-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Failing Source',
        type: JobSourceType.API,
        isActive: true,
        consecutiveSyncFailures: 1,
      },
    });

    fetchSnapshot.mockRejectedValueOnce(new Error('provider unavailable'));

    await request(app.getHttpServer())
      .post(`/api/v1/admin/job-sources/${source.id}/sync`)
      .set(authHeader(accessToken))
      .expect(502);

    const updated = await prismaService.jobSource.findUnique({
      where: { id: source.id },
    });
    expect(updated?.lastErrorAt).toBeInstanceOf(Date);
    expect(updated?.lastErrorMessage).toContain('provider unavailable');
    expect(updated?.consecutiveSyncFailures).toBe(2);
  });
});
