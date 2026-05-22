import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

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
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prismaService = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('/api/v1/users/me returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('/api/v1/users/me returns safe profile with valid token', async () => {
    const email = `users-me-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Users Me',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set(authHeader(registerResponse.body.accessToken as string))
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.email).toBe(email);
        expect(body.name).toBe('Users Me');
      });
  });

  it('/api/v1/users/me response never includes passwordHash', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Users Safe',
        email: `users-safe-${Date.now()}@example.com`,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set(authHeader(registerResponse.body.accessToken as string))
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('/api/v1/users/me PATCH updates timezone', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Timezone User',
        email: `users-tz-${Date.now()}@example.com`,
        password: 'StrongPassword123',
      })
      .expect(201);

    const token = registerResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(token))
      .send({ timezone: 'America/New_York' })
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.timezone).toBe('America/New_York');
      });

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(token))
      .send({ timezone: null })
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.timezone).toBeNull();
      });
  });
});
