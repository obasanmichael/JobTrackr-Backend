import { z } from 'zod';
import {
  BadGatewayException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ResumeReview } from '@prisma/client';
import {
  ResumeParseStatus,
  ResumeReviewStatus,
  ResumeReviewType,
} from '@prisma/client';
import { AiInvocationError } from '../ai/resume-review/ai-invocation.error';
import type {
  ResumeReviewAiPort,
  ResumeReviewAiResult,
} from '../ai/resume-review/resume-review-ai.port';
import { StructuredResumeReviewValidationError } from '../ai/resume-review/resume-review-structured-output.schema';
import type { CurrentUser } from '../common/types/current-user.type';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateResumeReviewDto } from './dto/create-resume-review.dto';
import { ResumeReviewQuotaService } from './resume-review-quota.service';
import { ResumeReviewsService } from './resume-reviews.service';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const RESUME_ID = '22222222-2222-2222-2222-222222222222';
const REVIEW_ID = '33333333-3333-3333-3333-333333333333';
const USER: CurrentUser = {
  userId: USER_ID,
  email: 'u@example.com',
};

const VALID_AI: ResumeReviewAiResult = {
  structured: {
    overallScore: 78,
    atsScore: 72,
    strengths: ['a'],
    weaknesses: ['b'],
    missingKeywords: ['k'],
    suggestions: [
      {
        section: 'Experience',
        issue: 'x',
        recommendation: 'y',
      },
    ],
    summary: 'ok',
  },
  rawResponse: { mock: true },
};

function reviewRow(overrides: Partial<ResumeReview> = {}): ResumeReview {
  return {
    id: REVIEW_ID,
    userId: USER_ID,
    resumeId: RESUME_ID,
    applicationId: null,
    jobId: null,
    type: ResumeReviewType.GENERAL,
    overallScore: 78,
    atsScore: 72,
    keywordScore: null,
    structureScore: null,
    clarityScore: null,
    strengths: ['a'],
    weaknesses: ['b'],
    missingKeywords: ['k'],
    suggestions: [],
    improvedBullets: [],
    summary: 'ok',
    rawAiOutput: { structured: VALID_AI.structured },
    status: ResumeReviewStatus.COMPLETED,
    errorMessage: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

const parsedResume = {
  id: RESUME_ID,
  userId: USER_ID,
  status: ResumeParseStatus.PARSED,
  parsedText: 'Engineer with ten years experience.',
};

describe('ResumeReviewsService', () => {
  let service: ResumeReviewsService;
  let prisma: {
    resume: { findFirst: jest.Mock };
    candidateProfile: { findUnique: jest.Mock };
    jobApplication: { findFirst: jest.Mock };
    resumeReview: {
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let quota: {
    ensureMonthlyAiResumeReviewBudget: jest.Mock;
    recordSuccessfulAiResumeReview: jest.Mock;
  };
  let ai: {
    generateGeneralReview: jest.Mock;
    generateJobSpecificReview: jest.Mock;
  };

  beforeEach(() => {
    quota = {
      ensureMonthlyAiResumeReviewBudget: jest.fn().mockResolvedValue(undefined),
      recordSuccessfulAiResumeReview: jest.fn().mockResolvedValue(undefined),
    };
    ai = {
      generateGeneralReview: jest.fn().mockResolvedValue(VALID_AI),
      generateJobSpecificReview: jest.fn().mockResolvedValue(VALID_AI),
    };
    prisma = {
      resume: { findFirst: jest.fn() },
      candidateProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      jobApplication: { findFirst: jest.fn() },
      resumeReview: {
        create: jest.fn().mockResolvedValue({ id: REVIEW_ID }),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation((input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input as Promise<unknown>[]);
      }
      if (typeof input === 'function') {
        const tx = {
          resumeReview: {
            update: jest.fn().mockResolvedValue(reviewRow()),
          },
        };
        return (input as (t: typeof tx) => Promise<unknown>)(tx);
      }
      return Promise.reject(new Error('unexpected $transaction input'));
    });

    service = new ResumeReviewsService(
      prisma as unknown as PrismaService,
      quota as unknown as ResumeReviewQuotaService,
      ai,
    );
  });

  describe('create', () => {
    const generalDto: CreateResumeReviewDto = {
      type: ResumeReviewType.GENERAL,
      resumeId: RESUME_ID,
    };

    it('throws Forbidden when monthly quota is exceeded', async () => {
      quota.ensureMonthlyAiResumeReviewBudget.mockRejectedValueOnce(
        new ForbiddenException('limit'),
      );

      await expect(service.create(USER, generalDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.resume.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFound when resume is missing', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(USER, generalDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.resumeReview.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest when resume is not parsed', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce({
        ...parsedResume,
        status: ResumeParseStatus.UPLOADED,
        parsedText: '',
      });

      await expect(service.create(USER, generalDto)).rejects.toMatchObject({
        response: expect.objectContaining({ statusCode: 400 }),
      });
      expect(prisma.resumeReview.create).not.toHaveBeenCalled();
    });

    it('completes GENERAL review, persists in a transaction, and records quota', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce(parsedResume);

      const result = await service.create(USER, generalDto);

      expect(result.id).toBe(REVIEW_ID);
      expect(result.status).toBe(ResumeReviewStatus.COMPLETED);
      expect(ai.generateGeneralReview).toHaveBeenCalled();
      expect(quota.recordSuccessfulAiResumeReview).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('marks FAILED and maps AiInvocationError to 502', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce(parsedResume);
      ai.generateGeneralReview.mockRejectedValueOnce(
        new AiInvocationError('upstream down'),
      );

      await expect(service.create(USER, generalDto)).rejects.toBeInstanceOf(
        BadGatewayException,
      );

      expect(prisma.resumeReview.update).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        data: expect.objectContaining({
          status: ResumeReviewStatus.FAILED,
          errorMessage: expect.stringContaining('upstream'),
        }),
      });
      expect(quota.recordSuccessfulAiResumeReview).not.toHaveBeenCalled();
    });

    it('marks FAILED and maps StructuredResumeReviewValidationError to 422', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce(parsedResume);
      const zodErr = new z.ZodError([
        {
          code: 'custom',
          path: ['overallScore'],
          message: 'invalid',
        },
      ]);
      ai.generateGeneralReview.mockRejectedValueOnce(
        new StructuredResumeReviewValidationError(zodErr),
      );

      await expect(service.create(USER, generalDto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(prisma.resumeReview.update).toHaveBeenCalled();
      expect(quota.recordSuccessfulAiResumeReview).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('returns paginated list with total', async () => {
      const row = reviewRow({ id: '44444444-4444-4444-4444-444444444444' });
      prisma.resumeReview.count.mockResolvedValueOnce(11);
      prisma.resumeReview.findMany.mockResolvedValueOnce([row]);

      const out = await service.findAllForUser(USER, { page: 2, limit: 10 });

      expect(out.total).toBe(11);
      expect(out.page).toBe(2);
      expect(out.limit).toBe(10);
      expect(out.items).toHaveLength(1);
      expect(prisma.resumeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
          }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('applies optional filters', async () => {
      prisma.resumeReview.count.mockResolvedValueOnce(1);
      prisma.resumeReview.findMany.mockResolvedValueOnce([]);

      await service.findAllForUser(USER, {
        resumeId: RESUME_ID,
        type: ResumeReviewType.JOB_SPECIFIC,
        status: ResumeReviewStatus.COMPLETED,
      });

      expect(prisma.resumeReview.count).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          resumeId: RESUME_ID,
          type: ResumeReviewType.JOB_SPECIFIC,
          status: ResumeReviewStatus.COMPLETED,
        },
      });
    });
  });

  describe('findAllForResume', () => {
    it('404 when resume not owned', async () => {
      prisma.resume.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findAllForResume(USER, RESUME_ID, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
