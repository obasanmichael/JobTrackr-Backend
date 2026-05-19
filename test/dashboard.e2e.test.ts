import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Dashboard User',
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

  it('returns 401 for dashboard summary without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .expect(401);
  });

  it('returns stable summary shape and only user-owned data', async () => {
    const owner = await registerUser(`dash-owner-${Date.now()}@example.com`);
    const other = await registerUser(`dash-other-${Date.now()}@example.com`);

    const ownerAppA = await prismaService.jobApplication.create({
      data: {
        userId: owner.userId,
        jobTitle: 'Backend Engineer',
        companyName: 'Acme',
        status: 'APPLIED',
      },
    });
    const ownerAppB = await prismaService.jobApplication.create({
      data: {
        userId: owner.userId,
        jobTitle: 'Platform Engineer',
        companyName: 'Beta',
        status: 'REJECTED',
      },
    });
    await prismaService.jobApplication.create({
      data: {
        userId: other.userId,
        jobTitle: 'Foreign App',
        companyName: 'Other',
        status: 'OFFER',
      },
    });

    const now = Date.now();
    await prismaService.reminder.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppA.id,
        title: 'Soon reminder',
        dueDate: new Date(now + 1000 * 60 * 20),
      },
    });
    await prismaService.reminder.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppB.id,
        title: 'Later reminder',
        dueDate: new Date(now + 1000 * 60 * 60),
      },
    });
    await prismaService.reminder.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppB.id,
        title: 'Completed reminder',
        dueDate: new Date(now + 1000 * 60 * 5),
        isCompleted: true,
      },
    });

    await prismaService.interview.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppA.id,
        stage: 'TECHNICAL_INTERVIEW',
        interviewType: 'VIDEO',
        scheduledAt: new Date(now + 1000 * 60 * 90),
      },
    });
    await prismaService.interview.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppA.id,
        stage: 'RECRUITER_SCREEN',
        interviewType: 'PHONE',
        scheduledAt: new Date(now + 1000 * 60 * 30),
      },
    });

    await prismaService.applicationEvent.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppA.id,
        type: 'NOTE',
        title: 'Older event',
        createdAt: new Date(now - 1000 * 60 * 20),
      },
    });
    await prismaService.applicationEvent.create({
      data: {
        userId: owner.userId,
        applicationId: ownerAppA.id,
        type: 'STATUS_CHANGE',
        title: 'Newer event',
        createdAt: new Date(now - 1000 * 60 * 5),
      },
    });
    await prismaService.applicationEvent.create({
      data: {
        userId: other.userId,
        applicationId: (
          await prismaService.jobApplication.findFirstOrThrow({
            where: { userId: other.userId },
            select: { id: true },
          })
        ).id,
        type: 'NOTE',
        title: 'Other user event',
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            totalApplications: number;
            activeApplications: number;
            offerCount: number;
            rejectionCount: number;
            applicationsByStatus: Record<string, number>;
            upcomingReminders: Array<{ title: string }>;
            upcomingInterviews: Array<{ stage: string }>;
            recentEvents: Array<{ title: string }>;
          };
        }) => {
          expect(body.totalApplications).toBe(2);
          expect(body.activeApplications).toBe(1);
          expect(body.offerCount).toBe(0);
          expect(body.rejectionCount).toBe(1);

          expect(body.applicationsByStatus.SAVED).toBeDefined();
          expect(body.applicationsByStatus.APPLIED).toBe(1);
          expect(body.applicationsByStatus.REJECTED).toBe(1);
          expect(body.applicationsByStatus.OFFER).toBe(0);

          expect(body.upcomingReminders).toHaveLength(2);
          expect(body.upcomingReminders[0].title).toBe('Soon reminder');
          expect(body.upcomingReminders[1].title).toBe('Later reminder');

          expect(body.upcomingInterviews).toHaveLength(2);
          expect(body.upcomingInterviews[0].stage).toBe('RECRUITER_SCREEN');
          expect(body.upcomingInterviews[1].stage).toBe('TECHNICAL_INTERVIEW');

          expect(body.recentEvents).toHaveLength(2);
          expect(body.recentEvents[0].title).toBe('Newer event');
          expect(body.recentEvents[1].title).toBe('Older event');
        },
      );
  });
});
