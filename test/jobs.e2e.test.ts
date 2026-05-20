import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ExternalJobRemoteType, JobSourceType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jobs (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Jobs User',
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
    }).compile();

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

  it('returns 401 for job search without auth', async () => {
    await request(app.getHttpServer()).get('/api/v1/jobs').expect(401);
  });

  it('searches active external jobs with filters and pagination', async () => {
    const { accessToken } = await registerUser(
      `jobs-search-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Demo Greenhouse',
        type: JobSourceType.ATS_FEED,
        isActive: true,
      },
    });

    const activeJob = await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'gh-100',
        title: 'Backend Engineer',
        company: 'Acme',
        location: 'London, UK',
        remoteType: ExternalJobRemoteType.REMOTE,
        applicationUrl: 'https://jobs.example/acme/100',
        description: 'Build APIs for job search.',
        postedAt: new Date(),
        isActive: true,
      },
    });

    await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'gh-200',
        title: 'Inactive Role',
        company: 'Acme',
        applicationUrl: 'https://jobs.example/acme/200',
        isActive: false,
      },
    });

    const searchResponse = await request(app.getHttpServer())
      .get('/api/v1/jobs')
      .set(authHeader(accessToken))
      .query({ q: 'backend', location: 'London', page: 1, limit: 10 })
      .expect(200);

    expect(searchResponse.body.total).toBe(1);
    expect(searchResponse.body.jobs).toHaveLength(1);
    expect(searchResponse.body.jobs[0].id).toBe(activeJob.id);
    expect(searchResponse.body.jobs[0].applyUrl).toBe(
      'https://jobs.example/acme/100',
    );
    expect(searchResponse.body.jobs[0].source).toBe('Demo Greenhouse');
    expect(searchResponse.body.jobs[0].sourceMeta).toEqual({
      name: 'Demo Greenhouse',
      type: JobSourceType.ATS_FEED,
    });
  });

  it('returns job detail for active listing and 404 for inactive', async () => {
    const { accessToken } = await registerUser(
      `jobs-detail-${Date.now()}@example.com`,
    );

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Lever Demo',
        type: JobSourceType.ATS_FEED,
        isActive: true,
      },
    });

    const activeJob = await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'lv-1',
        title: 'Product Manager',
        company: 'Beta',
        applicationUrl: 'https://jobs.example/beta/1',
        description: 'Own the roadmap.',
        isActive: true,
      },
    });

    const inactiveJob = await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'lv-2',
        title: 'Old Role',
        company: 'Beta',
        applicationUrl: 'https://jobs.example/beta/2',
        isActive: false,
      },
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/jobs/${activeJob.id}`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(detailResponse.body.title).toBe('Product Manager');
    expect(detailResponse.body.description).toBe('Own the roadmap.');
    expect(detailResponse.body.sourceMeta).toEqual({
      name: 'Lever Demo',
      type: JobSourceType.ATS_FEED,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/jobs/${inactiveJob.id}`)
      .set(authHeader(accessToken))
      .expect(404);
  });
});
