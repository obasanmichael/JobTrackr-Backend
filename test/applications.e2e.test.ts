import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Applications (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    return {
      accessToken: response.body.accessToken as string,
      userId: response.body.user.id as string,
    };
  };

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  const buildApplicationPayload = (overrides: Record<string, unknown> = {}) => ({
    jobTitle: 'Frontend Engineer',
    companyName: 'Acme Labs',
    ...overrides,
  });

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
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('returns 401 for protected applications route without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/applications').expect(401);
  });

  it('supports create/list/get/update/delete for owner', async () => {
    const user = await registerUser(`owner-${Date.now()}@example.com`);

    const created = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(buildApplicationPayload({ status: 'SAVED' }))
      .expect(201);

    const applicationId = created.body.id as string;
    expect(created.body.userId).toBe(user.userId);

    await request(app.getHttpServer())
      .get('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string }> }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(applicationId);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}`)
      .set(authHeader(user.accessToken))
      .expect(200)
      .expect(({ body }: { body: { id: string } }) => {
        expect(body.id).toBe(applicationId);
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${applicationId}`)
      .set(authHeader(user.accessToken))
      .send({ status: 'APPLIED' })
      .expect(200)
      .expect(({ body }: { body: { status: string } }) => {
        expect(body.status).toBe('APPLIED');
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/applications/${applicationId}`)
      .set(authHeader(user.accessToken))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}`)
      .set(authHeader(user.accessToken))
      .expect(404);
  });

  it('prevents cross-user ownership access', async () => {
    const userA = await registerUser(`owner-a-${Date.now()}@example.com`);
    const userB = await registerUser(`owner-b-${Date.now()}@example.com`);

    const created = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(userA.accessToken))
      .send(buildApplicationPayload())
      .expect(201);

    const applicationId = created.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}`)
      .set(authHeader(userB.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${applicationId}`)
      .set(authHeader(userB.accessToken))
      .send({ status: 'APPLIED' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/applications/${applicationId}`)
      .set(authHeader(userB.accessToken))
      .expect(404);
  });

  it('rejects invalid enum/date/url payloads', async () => {
    const user = await registerUser(`validation-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(buildApplicationPayload({ status: 'INVALID_STATUS' }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(buildApplicationPayload({ deadline: 'invalid-date' }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(buildApplicationPayload({ jobUrl: 'not-a-url' }))
      .expect(400);
  });

  it('supports predictable search/filter/sort behavior', async () => {
    const user = await registerUser(`query-${Date.now()}@example.com`);

    const first = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(
        buildApplicationPayload({
          companyName: 'Acme Labs',
          status: 'APPLIED',
          deadline: '2026-06-01T00:00:00.000Z',
        }),
      )
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(
        buildApplicationPayload({
          companyName: 'Beta Corp',
          status: 'SAVED',
        }),
      )
      .expect(201);

    const third = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(user.accessToken))
      .send(
        buildApplicationPayload({
          jobTitle: 'Acme Frontend Specialist',
          status: 'APPLIED',
          deadline: '2026-05-20T00:00:00.000Z',
        }),
      )
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/applications?search=acme')
      .set(authHeader(user.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string }> }) => {
        const ids = body.map((item) => item.id);
        expect(ids).toEqual(
          expect.arrayContaining([first.body.id as string, third.body.id as string]),
        );
        expect(ids).not.toContain(second.body.id as string);
      });

    await request(app.getHttpServer())
      .get('/api/v1/applications?status=APPLIED')
      .set(authHeader(user.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ status: string }> }) => {
        expect(body).toHaveLength(2);
        expect(body.every((item) => item.status === 'APPLIED')).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/v1/applications?sort=deadline')
      .set(authHeader(user.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string; deadline: string | null }> }) => {
        expect(body[0].id).toBe(third.body.id as string);
        expect(body[1].id).toBe(first.body.id as string);
        expect(body[2].id).toBe(second.body.id as string);
        expect(body[2].deadline).toBeNull();
      });
  });
});
