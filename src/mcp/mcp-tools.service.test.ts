import { McpToolsService } from './mcp-tools.service';

describe('McpToolsService', () => {
  const user = { userId: 'user-1', email: 'user@example.com' };
  let applications: Record<string, jest.Mock>;
  let events: Record<string, jest.Mock>;
  let interviews: Record<string, jest.Mock>;
  let service: McpToolsService;

  const app = (overrides = {}) => ({
    id: 'app-1',
    userId: 'user-1',
    companyName: 'Acme',
    jobTitle: 'Backend Engineer',
    workMode: 'UNSPECIFIED',
    salaryMin: null,
    salaryMax: null,
    currency: 'USD',
    status: 'APPLIED',
    source: 'OTHER',
    jobUrl: null,
    location: null,
    deadline: null,
    notes: null,
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
    ...overrides,
  });

  beforeEach(() => {
    applications = {
      findByCompanyAndTitle: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    events = {
      createForApplication: jest
        .fn()
        .mockResolvedValue({ id: 'evt-1', type: 'NOTE', title: 't' }),
    };
    interviews = {
      create: jest.fn(),
      findUpcoming: jest.fn(),
      findExisting: jest.fn().mockResolvedValue(null),
    };
    service = new McpToolsService(
      applications as never,
      events as never,
      interviews as never,
    );
  });

  describe('logApplication', () => {
    it('creates an APPLIED application and a timeline entry when none exists', async () => {
      applications.findByCompanyAndTitle.mockResolvedValue(null);
      applications.create.mockResolvedValue(app());

      const result = await service.logApplication(user, {
        companyName: 'Acme',
        jobTitle: 'Backend Engineer',
        notes: 'Tailored resume for payments work',
      });

      expect(result.action).toBe('created');
      expect(applications.create).toHaveBeenCalledWith(
        user,
        expect.objectContaining({
          status: 'APPLIED',
          notes: 'Tailored resume for payments work',
        }),
      );
      expect(events.createForApplication).toHaveBeenCalledWith(
        user,
        'app-1',
        expect.objectContaining({ title: 'Applied' }),
      );
    });

    it('is idempotent: reuses the existing record, never overwrites, keeps notes as an event', async () => {
      applications.findByCompanyAndTitle.mockResolvedValue(
        app({
          status: 'SCREENING',
          jobUrl: 'https://old.example.com',
          source: 'LINKEDIN',
        }),
      );
      applications.update.mockResolvedValue(app({ status: 'SCREENING' }));

      const result = await service.logApplication(user, {
        companyName: 'acme',
        jobTitle: 'backend engineer',
        jobUrl: 'https://new.example.com',
        source: 'EMAIL',
        notes: 'Followed up by email',
      });

      expect(result.action).toBe('updated');
      expect(applications.create).not.toHaveBeenCalled();
      const patch = applications.update.mock.calls[0][2];
      expect(patch.jobUrl).toBeUndefined();
      expect(patch.source).toBeUndefined();
      expect(patch.status).toBeUndefined();
      expect(events.createForApplication).toHaveBeenCalledWith(
        user,
        'app-1',
        expect.objectContaining({
          type: 'NOTE',
          description: 'Followed up by email',
        }),
      );
    });

    it('never overwrites an existing currency, and fills salary + currency together only when empty', async () => {
      applications.findByCompanyAndTitle.mockResolvedValue(
        app({ currency: 'USD' }),
      );
      applications.update.mockResolvedValue(app());

      await service.logApplication(user, {
        companyName: 'Acme',
        jobTitle: 'Backend Engineer',
        currency: 'eur',
        salaryMin: 100,
        salaryMax: 200,
      });

      const patch = applications.update.mock.calls[0][2];
      expect(patch.currency).toBeUndefined();
      expect(patch.salaryMin).toBe(100);
      expect(patch.salaryMax).toBe(200);
    });

    it('does not mix an incoming salary into an existing range', async () => {
      applications.findByCompanyAndTitle.mockResolvedValue(
        app({ salaryMin: 0, salaryMax: 50, currency: null }),
      );
      applications.update.mockResolvedValue(app());

      await service.logApplication(user, {
        companyName: 'Acme',
        jobTitle: 'Backend Engineer',
        currency: 'eur',
        salaryMin: 100,
        salaryMax: 200,
      });

      const patch = applications.update.mock.calls[0][2];
      expect(patch.salaryMin).toBeUndefined();
      expect(patch.salaryMax).toBeUndefined();
      expect(patch.currency).toBe('EUR');
    });

    it('rejects salaryMax below salaryMin and upper-cases currency on create', async () => {
      await expect(
        service.logApplication(user, {
          companyName: 'Acme',
          jobTitle: 'Backend Engineer',
          salaryMin: 200,
          salaryMax: 100,
        }),
      ).rejects.toThrow(
        'salaryMax must be greater than or equal to salaryMin.',
      );
      expect(applications.findByCompanyAndTitle).not.toHaveBeenCalled();

      applications.findByCompanyAndTitle.mockResolvedValue(null);
      applications.create.mockResolvedValue(app());
      await service.logApplication(user, {
        companyName: 'Acme',
        jobTitle: 'Backend Engineer',
        currency: 'usd',
      });
      expect(applications.create.mock.calls[0][1].currency).toBe('USD');
    });

    it('promotes a SAVED application to APPLIED', async () => {
      applications.findByCompanyAndTitle.mockResolvedValue(
        app({ status: 'SAVED' }),
      );
      applications.update.mockResolvedValue(app());

      await service.logApplication(user, {
        companyName: 'Acme',
        jobTitle: 'Backend Engineer',
      });

      expect(applications.update.mock.calls[0][2].status).toBe('APPLIED');
    });
  });

  describe('scheduleInterview', () => {
    const input = {
      applicationId: 'app-1',
      stage: 'TECHNICAL_INTERVIEW' as const,
      interviewType: 'VIDEO' as const,
      scheduledAt: new Date('2026-11-10T15:00:00Z'),
    };

    beforeEach(() => {
      interviews.create.mockResolvedValue({
        id: 'int-1',
        stage: input.stage,
        interviewType: input.interviewType,
        scheduledAt: input.scheduledAt,
      });
    });

    it('advances APPLIED to INTERVIEW and logs a timeline entry', async () => {
      applications.findOne.mockResolvedValue(app({ status: 'APPLIED' }));
      applications.update.mockResolvedValue(app({ status: 'INTERVIEW' }));

      const result = await service.scheduleInterview(user, input);

      expect(applications.update).toHaveBeenCalledWith(user, 'app-1', {
        status: 'INTERVIEW',
      });
      expect(result.application.status).toBe('INTERVIEW');
      expect(events.createForApplication).toHaveBeenCalledWith(
        user,
        'app-1',
        expect.objectContaining({ type: 'INTERVIEW_UPDATE' }),
      );
    });

    it.each(['FINAL_INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'])(
      'does not touch status when already %s',
      async (status) => {
        applications.findOne.mockResolvedValue(app({ status }));

        await service.scheduleInterview(user, input);

        expect(applications.update).not.toHaveBeenCalled();
      },
    );

    it('does not write anything when the application is not owned', async () => {
      applications.findOne.mockRejectedValue(
        new Error('Application not found.'),
      );

      await expect(service.scheduleInterview(user, input)).rejects.toThrow();
      expect(interviews.create).not.toHaveBeenCalled();
      expect(events.createForApplication).not.toHaveBeenCalled();
    });

    it('is idempotent: returns the existing interview without re-creating or re-logging', async () => {
      applications.findOne.mockResolvedValue(app({ status: 'INTERVIEW' }));
      interviews.findExisting.mockResolvedValue({
        id: 'int-0',
        stage: input.stage,
        interviewType: input.interviewType,
        scheduledAt: input.scheduledAt,
      });

      const result = await service.scheduleInterview(user, input);

      expect(result.action).toBe('existing');
      expect(result.interview.id).toBe('int-0');
      expect(interviews.create).not.toHaveBeenCalled();
      expect(events.createForApplication).not.toHaveBeenCalled();
    });

    it('still reports the saved interview when follow-up steps fail', async () => {
      applications.findOne.mockResolvedValue(app({ status: 'APPLIED' }));
      applications.update.mockRejectedValue(new Error('db timeout'));

      const result = await service.scheduleInterview(user, input);

      expect(result.action).toBe('created');
      expect(result.interview.id).toBe('int-1');
    });
  });

  it('joins upcoming interviews with their application', async () => {
    interviews.findUpcoming.mockResolvedValue([
      {
        id: 'int-1',
        applicationId: 'app-1',
        stage: 'HIRING_MANAGER',
        interviewType: 'VIDEO',
        scheduledAt: new Date(),
      },
    ]);
    applications.findByIds.mockResolvedValue([app()]);

    const result = await service.listUpcomingInterviews(user);

    expect(applications.findByIds).toHaveBeenCalledWith(user, ['app-1']);
    expect(result.interviews[0]).toMatchObject({
      companyName: 'Acme',
      jobTitle: 'Backend Engineer',
    });
  });

  it('updateStatus records the optional note as a timeline entry', async () => {
    applications.update.mockResolvedValue(app({ status: 'REJECTED' }));

    await service.updateStatus(user, 'app-1', 'REJECTED', 'Position filled');

    expect(applications.update).toHaveBeenCalledWith(user, 'app-1', {
      status: 'REJECTED',
    });
    expect(events.createForApplication).toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ description: 'Position filled' }),
    );
  });
});
