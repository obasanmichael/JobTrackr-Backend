import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JobSourceSubmissionStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Job source submissions (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Submitter',
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
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: { userId: string } } };
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
    await prismaService.jobSourceSubmission.deleteMany();
    await prismaService.externalJob.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.jobSourceSubmission.deleteMany();
    await prismaService.externalJob.deleteMany();
    await prismaService.jobSource.deleteMany();
    await prismaService.applicationEvent.deleteMany();
    await prismaService.interview.deleteMany();
    await prismaService.reminder.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('accepts a public careers page submission with ATS detection', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .send({
        companyName: 'Acme',
        careersUrl: 'https://boards.greenhouse.io/acme',
        submitterEmail: 'ops@acme.com',
      })
      .expect(201);

    expect(response.body.status).toBe(JobSourceSubmissionStatus.PENDING);
    expect(response.body.detectedAtsType).toBe('GREENHOUSE');
    expect(response.body.detectedSlug).toBe('acme');
  });

  it('links submitterUserId when authenticated', async () => {
    const { accessToken, userId } = await registerUser(
      `submit-${Date.now()}@example.com`,
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .set(authHeader(accessToken))
      .send({
        companyName: 'Beta',
        careersUrl: 'https://jobs.lever.co/beta',
      })
      .expect(201);

    expect(response.body.submitterUserId).toBe(userId);
    expect(response.body.detectedAtsType).toBe('LEVER');
  });

  it('returns 409 for duplicate pending careers URL', async () => {
    const payload = {
      companyName: 'Acme',
      careersUrl: 'https://boards.greenhouse.io/acme',
    };

    await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .send(payload)
      .expect(409);
  });

  it('admin can approve a submission and create a job source', async () => {
    const { accessToken } = await registerUser(
      `admin-${Date.now()}@example.com`,
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .send({
        companyName: 'Gamma',
        careersUrl: 'https://boards.greenhouse.io/gamma',
      })
      .expect(201);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/admin/job-source-submissions/${created.body.id}/approve`)
      .set(authHeader(accessToken))
      .send({ reviewerNotes: 'Looks good' })
      .expect(200);

    expect(approved.body.submission.status).toBe(
      JobSourceSubmissionStatus.APPROVED,
    );
    expect(approved.body.jobSource.name).toBe('Gamma');
    expect(approved.body.jobSource.config.provider).toBe('GREENHOUSE');

    const sources = await prismaService.jobSource.findMany();
    expect(sources).toHaveLength(1);
  });

  it('admin can reject a pending submission', async () => {
    const { accessToken } = await registerUser(
      `reject-${Date.now()}@example.com`,
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/job-source-submissions')
      .send({
        companyName: 'Delta',
        careersUrl: 'https://example.com/careers',
      })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/admin/job-source-submissions/${created.body.id}/reject`)
      .set(authHeader(accessToken))
      .send({ reviewerNotes: 'Not an ATS board' })
      .expect(200);

    expect(rejected.body.status).toBe(JobSourceSubmissionStatus.REJECTED);
  });
});
