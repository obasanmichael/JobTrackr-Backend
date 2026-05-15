import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reminders + Interviews (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Schedule User',
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
        jobTitle: 'Backend Engineer',
        companyName: 'Acme Labs',
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

  it('enforces reminder ownership and returns upcoming reminders sorted by dueDate', async () => {
    const owner = await registerUser(`rem-owner-${Date.now()}@example.com`);
    const other = await registerUser(`rem-other-${Date.now()}@example.com`);
    const appId = await createApplication(owner.accessToken);

    const dueSoon = new Date(Date.now() + 1000 * 60 * 30).toISOString();
    const dueLater = new Date(Date.now() + 1000 * 60 * 90).toISOString();

    const reminderA = await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set(authHeader(owner.accessToken))
      .send({ applicationId: appId, title: 'Soon reminder', dueDate: dueSoon })
      .expect(201);

    const reminderB = await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set(authHeader(owner.accessToken))
      .send({ applicationId: appId, title: 'Later reminder', dueDate: dueLater })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/reminders/${reminderB.body.id as string}`)
      .set(authHeader(owner.accessToken))
      .send({ isCompleted: true })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/reminders/${reminderA.body.id as string}`)
      .set(authHeader(other.accessToken))
      .send({ title: 'Hacked' })
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/reminders/upcoming')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string }> }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(reminderA.body.id as string);
      });
  });

  it('enforces interview ownership and returns upcoming interviews sorted by scheduledAt', async () => {
    const owner = await registerUser(`int-owner-${Date.now()}@example.com`);
    const other = await registerUser(`int-other-${Date.now()}@example.com`);
    const appId = await createApplication(owner.accessToken);

    const soon = new Date(Date.now() + 1000 * 60 * 45).toISOString();
    const later = new Date(Date.now() + 1000 * 60 * 120).toISOString();

    const intA = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set(authHeader(owner.accessToken))
      .send({
        applicationId: appId,
        stage: 'TECHNICAL_INTERVIEW',
        interviewType: 'VIDEO',
        scheduledAt: later,
      })
      .expect(201);

    const intB = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set(authHeader(owner.accessToken))
      .send({
        applicationId: appId,
        stage: 'RECRUITER_SCREEN',
        interviewType: 'PHONE',
        scheduledAt: soon,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/interviews/${intA.body.id as string}`)
      .set(authHeader(other.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/interviews/upcoming')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }: { body: Array<{ id: string }> }) => {
        expect(body).toHaveLength(2);
        expect(body[0].id).toBe(intB.body.id as string);
        expect(body[1].id).toBe(intA.body.id as string);
      });
  });
});
