import { SavedJobStatus } from '@prisma/client';
import { ApplicationEventsService } from '../application-events/application-events.service';
import { ApplicationsService } from '../applications/applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SavedJobsService } from './saved-jobs.service';

describe('SavedJobsService', () => {
  let service: SavedJobsService;
  let prisma: {
    externalJob: { findFirst: jest.Mock };
    savedJob: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let applications: { create: jest.Mock; findOne: jest.Mock };
  let events: { createForApplication: jest.Mock };

  const user = { userId: 'u1', email: 'a@b.com' };

  const listing = {
    id: 'job-uuid',
    isActive: true,
    isSuspicious: false,
    title: 'Engineer',
    company: 'Acme',
    applicationUrl: 'https://acme/j',
    location: 'NYC',
    remoteType: 'REMOTE',
    salaryMin: 100,
    salaryMax: 200,
    currency: 'USD',
    sourceName: 'Src',
    source: { name: 'Src', type: 'API' },
  };

  beforeEach(() => {
    applications = { create: jest.fn(), findOne: jest.fn() };
    events = { createForApplication: jest.fn() };

    prisma = {
      externalJob: { findFirst: jest.fn() },
      savedJob: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    service = new SavedJobsService(
      prisma as unknown as PrismaService,
      applications as unknown as ApplicationsService,
      events as unknown as ApplicationEventsService,
    );
  });

  it('save creates when listing exists and no prior row', async () => {
    prisma.externalJob.findFirst.mockResolvedValue(listing);
    prisma.savedJob.findUnique.mockResolvedValue(null);
    prisma.savedJob.create.mockResolvedValue({
      id: 's1',
      userId: user.userId,
      jobListingId: listing.id,
      status: SavedJobStatus.SAVED,
      notes: null,
      convertedApplicationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      listing,
    });

    const out = await service.save(user, {
      externalJobId: listing.id,
    });

    expect(out.id).toBe('s1');
    expect(prisma.savedJob.create).toHaveBeenCalled();
  });

  it('save returns existing when duplicate', async () => {
    prisma.externalJob.findFirst.mockResolvedValue(listing);
    prisma.savedJob.findUnique.mockResolvedValue({
      id: 's-existing',
      userId: user.userId,
      jobListingId: listing.id,
      status: SavedJobStatus.SAVED,
      notes: null,
      convertedApplicationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      listing,
    });

    await service.save(user, { externalJobId: listing.id });
    expect(prisma.savedJob.create).not.toHaveBeenCalled();
  });

  it('convert creates application updates saved row and timelines', async () => {
    prisma.savedJob.findFirst.mockResolvedValueOnce({
      id: 's1',
      userId: user.userId,
      jobListingId: listing.id,
      status: SavedJobStatus.SAVED,
      notes: 'n',
      convertedApplicationId: null,
      listing,
    });

    applications.create.mockResolvedValue({
      id: 'app-new',
      userId: user.userId,
      jobTitle: 'Engineer',
      companyName: 'Acme',
    });

    prisma.savedJob.update.mockResolvedValue({
      id: 's1',
      userId: user.userId,
      jobListingId: listing.id,
      status: SavedJobStatus.CONVERTED_TO_APPLICATION,
      notes: 'n',
      convertedApplicationId: 'app-new',
      createdAt: new Date(),
      updatedAt: new Date(),
      listing,
    });

    const result = await service.convert(user, 's1', {});

    expect(result.application.id).toBe('app-new');
    expect(applications.create).toHaveBeenCalled();
    expect(events.createForApplication).toHaveBeenCalledWith(
      user,
      'app-new',
      expect.objectContaining({ type: 'GENERAL_UPDATE' }),
    );

    expect(prisma.savedJob.update).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- jest mock
    const updateArg = prisma.savedJob.update.mock.calls[0]?.[0] as {
      data?: { status: string; convertedApplicationId: string };
    };
    expect(updateArg?.data?.status).toBe(
      SavedJobStatus.CONVERTED_TO_APPLICATION,
    );
    expect(updateArg?.data?.convertedApplicationId).toBe('app-new');
  });
});
