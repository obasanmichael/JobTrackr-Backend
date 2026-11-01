import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MCP server (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let rpcId = 0;

  const registerUser = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email, password: 'StrongPassword123' })
      .expect(201);
    return {
      accessToken: response.body.accessToken as string,
      userId: response.body.user.id as string,
    };
  };

  const createApiToken = async (accessToken: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/api-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Claude' })
      .expect(201);
    return response.body as { id: string; token: string };
  };

  const rpc = (token: string, method: string, params: object = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/mcp')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: ++rpcId, method, params });

  const callTool = async (
    token: string,
    name: string,
    args: Record<string, unknown> = {},
  ) => {
    const response = await rpc(token, 'tools/call', {
      name,
      arguments: args,
    }).expect(200);
    const { result, error } = response.body;
    if (error) {
      throw new Error(`JSON-RPC error: ${JSON.stringify(error)}`);
    }
    return {
      isError: Boolean(result.isError),
      data: JSON.parse(result.content[0].text) as any,
      text: result.content[0].text as string,
    };
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
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prismaService = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.apiToken.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.apiToken.deleteMany();
    await prismaService.jobApplication.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('rejects missing, malformed and JWT credentials on /mcp', async () => {
    const user = await registerUser(`jwt-${Date.now()}@example.com`);

    await request(app.getHttpServer()).post('/api/v1/mcp').send({}).expect(401);
    await rpc('jt_not-a-real-token', 'tools/list').expect(401);
    await rpc(user.accessToken, 'tools/list').expect(401);
  });

  it('answers GET/DELETE with 405 for authenticated clients', async () => {
    const user = await registerUser(`405-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    await request(app.getHttpServer())
      .get('/api/v1/mcp')
      .set('Authorization', `Bearer ${token}`)
      .expect(405);
  });

  it('does not accept an API token for token management', async () => {
    const user = await registerUser(`mint-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    await request(app.getHttpServer())
      .post('/api/v1/api-tokens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'escalation' })
      .expect(401);
  });

  it('lists the expected tools and no destructive ones', async () => {
    const user = await registerUser(`tools-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    const response = await rpc(token, 'tools/list').expect(200);
    const names = (response.body.result.tools as Array<{ name: string }>)
      .map((tool) => tool.name)
      .sort();

    expect(names).toEqual([
      'add_application_note',
      'find_applications',
      'list_upcoming_interviews',
      'log_application',
      'schedule_interview',
      'update_application_status',
    ]);
  });

  it('logs an application idempotently and records an interview', async () => {
    const user = await registerUser(`flow-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    const first = await callTool(token, 'log_application', {
      companyName: 'Acme Labs',
      jobTitle: 'Backend Engineer',
      source: 'EMAIL',
      notes: 'Tailored resume toward payments experience.',
    });
    expect(first.data.action).toBe('created');
    expect(first.data.application.status).toBe('APPLIED');
    const applicationId = first.data.application.id as string;

    const second = await callTool(token, 'log_application', {
      companyName: 'acme labs',
      jobTitle: 'BACKEND ENGINEER',
      notes: 'Sent a follow-up.',
    });
    expect(second.data.action).toBe('updated');
    expect(second.data.application.id).toBe(applicationId);
    expect(await prismaService.jobApplication.count()).toBe(1);

    const found = await callTool(token, 'find_applications', {
      search: 'acme',
    });
    expect(found.data.total).toBe(1);

    const scheduled = await callTool(token, 'schedule_interview', {
      applicationId,
      stage: 'TECHNICAL_INTERVIEW',
      interviewType: 'VIDEO',
      scheduledAt: '2099-01-15T15:00:00+01:00',
      meetingLink: 'https://meet.example.com/abc',
    });
    expect(scheduled.isError).toBe(false);
    expect(scheduled.data.application.status).toBe('INTERVIEW');

    const upcoming = await callTool(token, 'list_upcoming_interviews');
    expect(upcoming.data.interviews).toHaveLength(1);
    expect(upcoming.data.interviews[0]).toMatchObject({
      companyName: 'Acme Labs',
      stage: 'TECHNICAL_INTERVIEW',
    });

    const events = await prismaService.applicationEvent.findMany({
      where: { applicationId },
    });
    expect(events.map((event) => event.type).sort()).toEqual([
      'GENERAL_UPDATE',
      'INTERVIEW_UPDATE',
      'NOTE',
      'STATUS_CHANGE',
    ]);
  });

  it('rejects javascript: links and does not duplicate a retried interview', async () => {
    const user = await registerUser(`links-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    const bad = await rpc(token, 'tools/call', {
      name: 'log_application',
      arguments: {
        companyName: 'Evil Corp',
        jobTitle: 'Engineer',
        jobUrl: 'javascript:alert(1)',
      },
    }).expect(200);
    expect(
      bad.body.error !== undefined || bad.body.result?.isError === true,
    ).toBe(true);
    expect(await prismaService.jobApplication.count()).toBe(0);

    const logged = await callTool(token, 'log_application', {
      companyName: 'Acme Labs',
      jobTitle: 'Backend Engineer',
    });
    const args = {
      applicationId: logged.data.application.id as string,
      stage: 'HIRING_MANAGER',
      interviewType: 'PHONE',
      scheduledAt: '2099-02-01T09:00:00Z',
    };
    const first = await callTool(token, 'schedule_interview', args);
    const second = await callTool(token, 'schedule_interview', args);

    expect(first.data.action).toBe('created');
    expect(second.data.action).toBe('existing');
    expect(second.data.interview.id).toBe(first.data.interview.id);
    expect(await prismaService.interview.count()).toBe(1);
  });

  it('does not create duplicates when the same application is logged concurrently', async () => {
    const user = await registerUser(`race-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        callTool(token, 'log_application', {
          companyName: 'Race Co',
          jobTitle: 'Engineer',
        }),
      ),
    );

    expect(await prismaService.jobApplication.count()).toBe(1);
    expect(results.filter((r) => r.data.action === 'created')).toHaveLength(1);
  });

  it('rejects interviews scheduled in the past', async () => {
    const user = await registerUser(`past-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);
    const logged = await callTool(token, 'log_application', {
      companyName: 'Acme Labs',
      jobTitle: 'Backend Engineer',
    });

    const response = await rpc(token, 'tools/call', {
      name: 'schedule_interview',
      arguments: {
        applicationId: logged.data.application.id,
        stage: 'OTHER',
        interviewType: 'VIDEO',
        scheduledAt: '2020-01-01T10:00:00Z',
      },
    }).expect(200);

    expect(response.body.result.isError).toBe(true);
    expect(await prismaService.interview.count()).toBe(0);
  });

  it('reports tool failures as isError results, not protocol errors', async () => {
    const user = await registerUser(`err-${Date.now()}@example.com`);
    const { token } = await createApiToken(user.accessToken);

    const response = await rpc(token, 'tools/call', {
      name: 'update_application_status',
      arguments: {
        applicationId: '00000000-0000-4000-8000-000000000000',
        status: 'REJECTED',
      },
    }).expect(200);

    expect(response.body.error).toBeUndefined();
    expect(response.body.result.isError).toBe(true);
    expect(response.body.result.content[0].text).toBe('Application not found.');
  });

  it("never exposes or modifies another user's applications", async () => {
    const owner = await registerUser(`owner-${Date.now()}@example.com`);
    const intruder = await registerUser(`intruder-${Date.now()}@example.com`);
    const ownerToken = (await createApiToken(owner.accessToken)).token;
    const intruderToken = (await createApiToken(intruder.accessToken)).token;

    const logged = await callTool(ownerToken, 'log_application', {
      companyName: 'Secret Corp',
      jobTitle: 'Staff Engineer',
    });
    const applicationId = logged.data.application.id as string;

    const search = await callTool(intruderToken, 'find_applications', {
      search: 'secret',
    });
    expect(search.data.total).toBe(0);

    const hijack = await rpc(intruderToken, 'tools/call', {
      name: 'update_application_status',
      arguments: { applicationId, status: 'REJECTED' },
    }).expect(200);
    expect(hijack.body.result.isError).toBe(true);

    const stored = await prismaService.jobApplication.findUnique({
      where: { id: applicationId },
    });
    expect(stored?.status).toBe('APPLIED');
    expect(stored?.userId).toBe(owner.userId);
  });

  it('stops accepting a token once it is revoked', async () => {
    const user = await registerUser(`revoke-${Date.now()}@example.com`);
    const { id, token } = await createApiToken(user.accessToken);

    await rpc(token, 'tools/list').expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/api-tokens/${id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    await rpc(token, 'tools/list').expect(401);
  });
});
