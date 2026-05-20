import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ExternalJobRemoteType, JobSourceType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { EXTERNAL_JOB_QUALITY_FLAGS } from '../src/job-sources/quality/job-quality.constants';

describe('Job quality (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Quality Admin',
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => {
            getRequest: () => { user?: { userId: string } };
          };
        }) => {
          const user = ctx.switchToHttp().getRequest().user;
          if (!user?.userId) {
            throw new UnauthorizedException();
          }
          return true;
        },
      })
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

  it('admin scan flags suspicious jobs and search excludes them', async () => {
    const { accessToken } = await registerUser(
      `quality-scan-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Quality Demo',
        type: JobSourceType.ATS_FEED,
        isActive: true,
      },
    });

    const goodJob = await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'good-1',
        title: 'Good Role',
        company: 'Acme',
        applicationUrl: 'https://jobs.example/good-1',
        remoteType: ExternalJobRemoteType.REMOTE,
        isActive: true,
      },
    });

    await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'bad-1',
        title: 'Bad Role',
        company: 'Acme',
        applicationUrl: null,
        isActive: true,
      },
    });

    const scanResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/job-quality/scan')
      .set(authHeader(accessToken))
      .expect(200);

    expect(scanResponse.body.scannedCount).toBe(2);
    expect(scanResponse.body.suspiciousCount).toBe(1);
    expect(scanResponse.body.flaggedByReason).toEqual({
      [EXTERNAL_JOB_QUALITY_FLAGS.MISSING_APPLICATION_URL]: 1,
    });

    const searchResponse = await request(app.getHttpServer())
      .get('/api/v1/jobs')
      .set(authHeader(accessToken))
      .expect(200);

    expect(searchResponse.body.total).toBe(1);
    expect(searchResponse.body.jobs[0].id).toBe(goodJob.id);
  });

  it('admin purge dry-run counts inactive rows without deleting', async () => {
    const { accessToken } = await registerUser(
      `quality-purge-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Purge Demo',
        type: JobSourceType.ATS_FEED,
        isActive: true,
      },
    });

    const oldCutoff = new Date();
    oldCutoff.setUTCDate(oldCutoff.getUTCDate() - 120);

    await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'old-1',
        title: 'Old Role',
        company: 'Acme',
        applicationUrl: 'https://jobs.example/old-1',
        isActive: false,
        updatedAt: oldCutoff,
      },
    });

    const purgeResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/job-quality/purge-inactive?dryRun=true')
      .set(authHeader(accessToken))
      .expect(200);

    expect(purgeResponse.body.dryRun).toBe(true);
    expect(purgeResponse.body.matchedCount).toBe(1);
    expect(purgeResponse.body.deletedCount).toBe(0);

    const remaining = await prismaService.externalJob.count();
    expect(remaining).toBe(1);
  });
});
