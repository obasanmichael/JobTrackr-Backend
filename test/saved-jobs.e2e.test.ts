import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobSourceType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Saved jobs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function registerUser(email: string) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Sj User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    return {
      accessToken: res.body.accessToken as string,
      userId: res.body.user.id as string,
    };
  }

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
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.applicationEvent.deleteMany();
    await prisma.savedJob.deleteMany();
    await prisma.externalJob.deleteMany();
    await prisma.jobSource.deleteMany();
    await prisma.jobApplication.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.applicationEvent.deleteMany();
    await prisma.savedJob.deleteMany();
    await prisma.externalJob.deleteMany();
    await prisma.jobSource.deleteMany();
    await prisma.jobApplication.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/saved-jobs').expect(401);
  });

  it('saves lists converts and shows timeline', async () => {
    const { accessToken } = await registerUser(`sj-${Date.now()}@example.com`);

    const source = await prisma.jobSource.create({
      data: {
        name: 'SrcCo',
        type: JobSourceType.API,
      },
    });

    const job = await prisma.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: 'SrcCo',
        externalJobId: 'ext-123',
        title: 'Rust Dev',
        company: 'Labs',
        applicationUrl: 'https://labs.example/j/1',
        location: 'Remote',
        salaryMin: 80_000,
        salaryMax: 120_000,
        currency: 'USD',
        description: '<p>d</p>',
      },
    });

    const saveRes = await request(app.getHttpServer())
      .post('/api/v1/saved-jobs')
      .set(authHeader(accessToken))
      .send({ externalJobId: job.id })
      .expect(200);

    const savedJobId = saveRes.body.id as string;
    expect(saveRes.body.job.id).toBe(job.id);

    await request(app.getHttpServer())
      .post('/api/v1/saved-jobs')
      .set(authHeader(accessToken))
      .send({ externalJobId: job.id })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/v1/saved-jobs')
      .set(authHeader(accessToken))
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.items).toHaveLength(1);

    const conv = await request(app.getHttpServer())
      .post(`/api/v1/saved-jobs/${savedJobId}/convert-to-application`)
      .set(authHeader(accessToken))
      .send({ notesAppend: 'Ready to apply' })
      .expect(200);

    const appId = conv.body.application.id as string;
    expect(conv.body.savedJob.status).toBe('CONVERTED_TO_APPLICATION');
    expect(conv.body.application.jobTitle).toBe('Rust Dev');
    expect(conv.body.application.companyName).toBe('Labs');

    const convAgain = await request(app.getHttpServer())
      .post(`/api/v1/saved-jobs/${savedJobId}/convert-to-application`)
      .set(authHeader(accessToken))
      .send({});
    expect(convAgain.body.application.id).toBe(appId);

    const ev = await request(app.getHttpServer())
      .get(`/api/v1/applications/${appId}/events`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(
      ev.body.some((e: { type: string }) => e.type === 'GENERAL_UPDATE'),
    ).toBe(true);

    const listConverted = await request(app.getHttpServer())
      .get('/api/v1/saved-jobs')
      .query({ includeConverted: true })
      .set(authHeader(accessToken))
      .expect(200);

    expect(listConverted.body.total).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/saved-jobs/${savedJobId}`)
      .set(authHeader(accessToken))
      .expect(204);
  });

  it('returns 404 for save when listing suspicious', async () => {
    const { accessToken } = await registerUser(
      `sj-bad-${Date.now()}@example.com`,
    );

    const source = await prisma.jobSource.create({
      data: { name: 'X', type: JobSourceType.API },
    });

    const job = await prisma.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: 'X',
        externalJobId: 'x1',
        title: 'T',
        company: 'C',
        isSuspicious: true,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/saved-jobs')
      .set(authHeader(accessToken))
      .send({ externalJobId: job.id })
      .expect(404);
  });
});
