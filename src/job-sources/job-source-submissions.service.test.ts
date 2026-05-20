import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JobSourceSubmissionStatus, JobSourceType } from '@prisma/client';
import { JobSourceSubmissionsService } from './job-source-submissions.service';

describe('JobSourceSubmissionsService', () => {
  let service: JobSourceSubmissionsService;
  let prisma: {
    jobSourceSubmission: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    jobSource: { findMany: jest.Mock };
  };
  let jobSourcesService: {
    createForAdmin: jest.Mock;
    updateForAdmin: jest.Mock;
  };
  let jobIngestOrchestrationService: { syncExternalJobs: jest.Mock };

  beforeEach(() => {
    prisma = {
      jobSourceSubmission: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      jobSource: { findMany: jest.fn() },
    };
    jobSourcesService = {
      createForAdmin: jest.fn(),
      updateForAdmin: jest.fn(),
    };
    jobIngestOrchestrationService = { syncExternalJobs: jest.fn() };

    service = new JobSourceSubmissionsService(
      prisma as never,
      jobSourcesService as never,
      jobIngestOrchestrationService as never,
    );
  });

  describe('create', () => {
    it('creates a pending submission with ATS detection', async () => {
      prisma.jobSourceSubmission.findFirst.mockResolvedValueOnce(null);
      prisma.jobSourceSubmission.create.mockResolvedValueOnce({
        id: 'sub-1',
        companyName: 'Acme',
        careersUrl: 'https://boards.greenhouse.io/acme',
        submitterEmail: 'ops@acme.com',
        submitterUserId: null,
        detectedAtsType: 'GREENHOUSE',
        detectedSlug: 'acme',
        status: JobSourceSubmissionStatus.PENDING,
        jobSourceId: null,
        reviewerNotes: null,
        reviewedAt: null,
        createdAt: new Date('2026-05-20T12:00:00.000Z'),
        updatedAt: new Date('2026-05-20T12:00:00.000Z'),
      });

      const result = await service.create({
        companyName: 'Acme',
        careersUrl: 'https://boards.greenhouse.io/acme/?ref=1',
        submitterEmail: 'ops@acme.com',
      });

      expect(prisma.jobSourceSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            careersUrl: 'https://boards.greenhouse.io/acme',
            detectedAtsType: 'GREENHOUSE',
            detectedSlug: 'acme',
          }),
        }),
      );
      expect(result.detectedAtsType).toBe('GREENHOUSE');
    });

    it('throws ConflictException when a pending duplicate exists', async () => {
      prisma.jobSourceSubmission.findFirst.mockResolvedValueOnce({ id: 'dup' });

      await expect(
        service.create({
          companyName: 'Acme',
          careersUrl: 'https://boards.greenhouse.io/acme',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('approve', () => {
    const pendingSubmission = {
      id: 'sub-1',
      companyName: 'Acme',
      careersUrl: 'https://boards.greenhouse.io/acme',
      submitterEmail: null,
      submitterUserId: null,
      detectedAtsType: 'GREENHOUSE',
      detectedSlug: 'acme',
      status: JobSourceSubmissionStatus.PENDING,
      jobSourceId: null,
      reviewerNotes: null,
      submitterIp: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a job source and runs first sync', async () => {
      prisma.jobSourceSubmission.findUnique.mockResolvedValueOnce(
        pendingSubmission,
      );
      prisma.jobSource.findMany.mockResolvedValueOnce([]);
      jobSourcesService.createForAdmin.mockResolvedValueOnce({
        id: 'src-1',
        name: 'Acme',
        type: JobSourceType.ATS_FEED,
        baseUrl: 'https://boards.greenhouse.io/acme',
        isActive: true,
        requiresApiKey: false,
        config: { provider: 'GREENHOUSE', board_token: 'acme' },
        lastSyncAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.jobSourceSubmission.update.mockResolvedValueOnce({
        ...pendingSubmission,
        status: JobSourceSubmissionStatus.APPROVED,
        jobSourceId: 'src-1',
        reviewedAt: new Date('2026-05-20T12:05:00.000Z'),
      });
      jobIngestOrchestrationService.syncExternalJobs.mockResolvedValueOnce({
        upsertedCount: 3,
        skippedInvalid: 0,
        inactivatedCount: 0,
        durationMs: 100,
        syncedAt: new Date('2026-05-20T12:05:01.000Z'),
      });

      const result = await service.approve('sub-1');

      expect(jobSourcesService.createForAdmin).toHaveBeenCalled();
      expect(jobIngestOrchestrationService.syncExternalJobs).toHaveBeenCalledWith(
        'src-1',
      );
      expect(result.sync?.upsertedCount).toBe(3);
      expect(result.submission.status).toBe(JobSourceSubmissionStatus.APPROVED);
    });

    it('throws NotFoundException when submission is missing', async () => {
      prisma.jobSourceSubmission.findUnique.mockResolvedValueOnce(null);

      await expect(service.approve('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when submission is not pending', async () => {
      prisma.jobSourceSubmission.findUnique.mockResolvedValueOnce({
        ...pendingSubmission,
        status: JobSourceSubmissionStatus.REJECTED,
      });

      await expect(service.approve('sub-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('marks a pending submission rejected', async () => {
      prisma.jobSourceSubmission.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        status: JobSourceSubmissionStatus.PENDING,
      });
      prisma.jobSourceSubmission.update.mockResolvedValueOnce({
        id: 'sub-1',
        companyName: 'Acme',
        careersUrl: 'https://boards.greenhouse.io/acme',
        submitterEmail: null,
        submitterUserId: null,
        detectedAtsType: 'GREENHOUSE',
        detectedSlug: 'acme',
        status: JobSourceSubmissionStatus.REJECTED,
        jobSourceId: null,
        reviewerNotes: 'Duplicate board',
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.reject('sub-1', {
        reviewerNotes: 'Duplicate board',
      });

      expect(result.status).toBe(JobSourceSubmissionStatus.REJECTED);
    });
  });
});
