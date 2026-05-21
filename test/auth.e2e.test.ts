import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
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
    await prismaService.passwordResetToken.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.passwordResetToken.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('register success returns safe user profile and accessToken', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Auth User',
        email: `auth-register-${Date.now()}@example.com`,
        password: 'StrongPassword123',
      })
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: {
            accessToken: string;
            user: Record<string, unknown>;
          };
        }) => {
          expect(typeof body.accessToken).toBe('string');
          expect(body.accessToken.length).toBeGreaterThan(10);
          expect(body.user).toMatchObject({
            name: 'Auth User',
          });
          expect(body.user).not.toHaveProperty('passwordHash');
        },
      );
  });

  it('register fails for duplicate email with standardized error shape', async () => {
    const email = `auth-dup-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Auth User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Auth User',
        email,
        password: 'StrongPassword123',
      })
      .expect(409)
      .expect(
        ({
          body,
        }: {
          body: {
            statusCode: number;
            message: string;
            error: string;
            timestamp: string;
            path: string;
          };
        }) => {
          expect(body.statusCode).toBe(409);
          expect(body.error).toBe('Conflict');
          expect(body.message).toBe(
            'An account with this email already exists.',
          );
          expect(body.path).toBe('/api/v1/auth/register');
          expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
        },
      );
  });

  it('login success returns user and accessToken', async () => {
    const email = `auth-login-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Login User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password: 'StrongPassword123',
      })
      .expect(201)
      .expect(
        ({ body }: { body: { accessToken: string; user: { id: string } } }) => {
          expect(body.user.id).toBe(registerResponse.body.user.id as string);
          expect(body.accessToken).toBeTruthy();
        },
      );
  });

  it('login fails for wrong password with generic error', async () => {
    const email = `auth-wrong-pass-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Wrong Password User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password: 'WrongPassword999',
      })
      .expect(401)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Invalid credentials');
      });
  });

  it('/api/v1/auth/me returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401)
      .expect(({ body }: { body: { statusCode: number; error: string } }) => {
        expect(body.statusCode).toBe(401);
        expect(body.error.toLowerCase()).toBe('unauthorized');
      });
  });

  it('/api/v1/auth/me returns safe profile with valid token', async () => {
    const email = `auth-me-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Me User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(authHeader(registerResponse.body.accessToken as string))
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.email).toBe(email);
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('throttles repeated auth attempts on login endpoint', async () => {
    const email = `auth-throttle-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Throttle User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    let throttleTriggered = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'WrongPassword999',
        });

      if (response.status === 429) {
        throttleTriggered = true;
        break;
      }

      expect(response.status).toBe(401);
    }

    expect(throttleTriggered).toBe(true);
  });

  it('change-password updates password for authenticated user', async () => {
    const email = `auth-change-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Change Password User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set(authHeader(registerResponse.body.accessToken as string))
      .send({
        currentPassword: 'StrongPassword123',
        newPassword: 'EvenStrongerPassword456',
      })
      .expect(200)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Password updated successfully.');
      });
  });

  it('forgot-password always returns generic success message', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'missing-user@example.com' })
      .expect(200)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toContain('If an account exists');
      });
  });

  it('reset-password accepts valid token and signs user in', async () => {
    const email = `auth-reset-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Reset Password User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    const userId = registerResponse.body.user.id as string;
    const rawToken = 'c'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prismaService.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'ResetPassword789',
      })
      .expect(201)
      .expect(({ body }: { body: { accessToken: string } }) => {
        expect(body.accessToken).toBeTruthy();
      });
  });
});
