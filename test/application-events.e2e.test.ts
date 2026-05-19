import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Application Events (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Timeline User',
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

  const createApplication = async (token: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(authHeader(token))
      .send({
        jobTitle: 'Frontend Engineer',
        companyName: 'Acme Labs',
        status: 'SAVED',
      })
      .expect(201);

    return response.body.id as string;
  };

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
    await prismaService.applicationEvent.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.applicationEvent.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('requires auth for timeline endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/applications/550e8400-e29b-41d4-a716-446655440000/events')
      .expect(401);
  });

  it('supports manual create/list/delete event for owner only', async () => {
    const owner = await registerUser(
      `timeline-owner-${Date.now()}@example.com`,
    );
    const otherUser = await registerUser(
      `timeline-other-${Date.now()}@example.com`,
    );

    const applicationId = await createApplication(owner.accessToken);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/events`)
      .set(authHeader(owner.accessToken))
      .send({
        type: 'NOTE',
        title: 'Recruiter replied',
        description: 'Asked for portfolio.',
      })
      .expect(201);

    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}/events`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string }> }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(eventId);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}/events`)
      .set(authHeader(otherUser.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/application-events/${eventId}`)
      .set(authHeader(otherUser.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/application-events/${eventId}`)
      .set(authHeader(owner.accessToken))
      .expect(204);
  });

  it('creates STATUS_CHANGE event on status transition', async () => {
    const owner = await registerUser(
      `timeline-status-${Date.now()}@example.com`,
    );
    const applicationId = await createApplication(owner.accessToken);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${applicationId}`)
      .set(authHeader(owner.accessToken))
      .send({ status: 'APPLIED' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}/events`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ type: string; title: string }> }) => {
        expect(body[0].type).toBe('STATUS_CHANGE');
        expect(body[0].title).toBe('Status changed from Saved to Applied');
      });
  });
});
