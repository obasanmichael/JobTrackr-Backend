import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ExternalJobRemoteType,
  JobSourceType,
  ResumeParseStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Matches (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Matches User',
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
    await prismaService.jobMatchResult.deleteMany();
    await prismaService.externalJob.deleteMany();
    await prismaService.candidateProfile.deleteMany();
    await prismaService.resume.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.jobMatchResult.deleteMany();
    await prismaService.externalJob.deleteMany();
    await prismaService.candidateProfile.deleteMany();
    await prismaService.resume.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('returns requiresProfile when user has no candidate profile', async () => {
    const { accessToken } = await registerUser(
      `matches-empty-${Date.now()}@example.com`,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/matches')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.requiresProfile).toBe(true);
    expect(response.body.matches).toEqual([]);
  });

  it('generates ranked matches from candidate profile and jobs', async () => {
    const { accessToken, userId } = await registerUser(
      `matches-user-${Date.now()}@example.com`,
    );

    const resume = await prismaService.resume.create({
      data: {
        userId,
        fileName: 'cv.pdf',
        fileType: 'application/pdf',
        fileSize: 1000,
        storageKey: `storage-${Date.now()}`,
        status: ResumeParseStatus.PARSED,
        parsedText: 'Software Engineer with React and TypeScript experience',
        isActive: true,
      },
    });

    await prismaService.candidateProfile.create({
      data: {
        userId,
        resumeId: resume.id,
        skills: ['React', 'TypeScript', 'Node.js'],
        roles: ['Software Engineer'],
        locations: ['Remote'],
        workModes: ['REMOTE'],
        yearsOfExperience: 5,
        extractionPipeline: 'heuristic:v1',
      },
    });

    const source = await prismaService.jobSource.create({
      data: {
        name: 'Demo',
        type: JobSourceType.ATS_FEED,
        isActive: true,
      },
    });

    const job = await prismaService.externalJob.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        externalJobId: 'gh-match-1',
        title: 'Senior Software Engineer',
        company: 'Acme',
        location: 'Remote',
        remoteType: ExternalJobRemoteType.REMOTE,
        description: 'Build products with React, TypeScript, and Node.js.',
        applicationUrl: 'https://jobs.example/acme/1',
        postedAt: new Date(),
        isActive: true,
      },
    });

    const generateResponse = await request(app.getHttpServer())
      .post('/api/v1/matches/generate')
      .set(authHeader(accessToken))
      .expect(200);

    expect(generateResponse.body.requiresProfile).toBe(false);
    expect(generateResponse.body.matches.length).toBeGreaterThan(0);
    expect(generateResponse.body.matches[0].job.id).toBe(job.id);
    expect(generateResponse.body.matches[0].matchReason).toEqual(
      expect.any(String),
    );

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/matches')
      .set(authHeader(accessToken))
      .expect(200);

    expect(listResponse.body.matches[0].overallScore).toBeGreaterThan(0);
  });

  it('returns default alert preferences before first save', async () => {
    const { accessToken } = await registerUser(
      `matches-alerts-${Date.now()}@example.com`,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/matches/alert-preferences')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.enabled).toBe(false);
    expect(response.body.minMatchScore).toBe(70);
    expect(response.body.channels).toBeNull();
  });

  it('persists alert preferences via PATCH', async () => {
    const { accessToken } = await registerUser(
      `matches-alerts-patch-${Date.now()}@example.com`,
    );

    await request(app.getHttpServer())
      .patch('/api/v1/matches/alert-preferences')
      .set(authHeader(accessToken))
      .send({
        enabled: true,
        minMatchScore: 80,
        channels: { email: true, push: false },
      })
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.enabled).toBe(true);
        expect(body.minMatchScore).toBe(80);
        expect(body.channels).toEqual({ email: true, push: false });
      });

    await request(app.getHttpServer())
      .get('/api/v1/matches/alert-preferences')
      .set(authHeader(accessToken))
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body.enabled).toBe(true);
        expect(body.minMatchScore).toBe(80);
      });
  });
});
