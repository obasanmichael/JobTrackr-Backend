import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ResumeReview } from '@prisma/client';
import {
  Prisma,
  ResumeParseStatus,
  ResumeReviewStatus,
  ResumeReviewType,
} from '@prisma/client';
import { AiInvocationError } from '../ai/resume-review/ai-invocation.error';
import type {
  ResumeReviewAiPort,
  ResumeReviewAiResult,
  ResumeReviewJobContext,
} from '../ai/resume-review/resume-review-ai.port';
import { RESUME_REVIEW_AI_PORT } from '../ai/resume-review/resume-review-ai.tokens';
import { StructuredResumeReviewValidationError } from '../ai/resume-review/resume-review-structured-output.schema';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateResumeReviewDto,
  ResumeReviewsQueryDto,
} from './dto/create-resume-review.dto';
import type { ResumeReviewResponseDto } from './dto/resume-review-response.dto';
import { ResumeReviewQuotaService } from './resume-review-quota.service';

@Injectable()
export class ResumeReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: ResumeReviewQuotaService,
    @Inject(RESUME_REVIEW_AI_PORT) private readonly ai: ResumeReviewAiPort,
  ) {}

  async create(
    user: CurrentUser,
    dto: CreateResumeReviewDto,
  ): Promise<ResumeReviewResponseDto> {
    await this.quota.ensureMonthlyAiResumeReviewBudget(user.userId);

    const resume = await this.prisma.resume.findFirst({
      where: { id: dto.resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (
      resume.status !== ResumeParseStatus.PARSED ||
      !resume.parsedText?.trim()
    ) {
      throw new BadRequestException(
        'Resume must finish parsing successfully before requesting an AI review',
      );
    }

    let linkedApplicationId: string | null = null;
    let jobContext: ResumeReviewJobContext | undefined;

    if (dto.type === ResumeReviewType.JOB_SPECIFIC) {
      const application = await this.prisma.jobApplication.findFirst({
        where: { id: dto.applicationId!, userId: user.userId },
      });
      if (!application) {
        throw new NotFoundException('Application not found');
      }

      linkedApplicationId = application.id;
      jobContext = {
        applicationJobTitle: application.jobTitle,
        applicationCompany: application.companyName,
        applicationNotes: application.notes,
        jobDescription: dto.jobDescription ?? null,
        externalJobId: dto.jobId ?? null,
      };
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { resumeId: resume.id },
    });

    const aiInput = {
      resumeParsedText: resume.parsedText,
      resumeSummary: profile?.summary ?? null,
      candidateHeadline: profile?.headline ?? null,
    };

    const review = await this.prisma.resumeReview.create({
      data: {
        userId: user.userId,
        resumeId: resume.id,
        applicationId: linkedApplicationId,
        jobId:
          dto.type === ResumeReviewType.JOB_SPECIFIC ? dto.jobId ?? null : null,
        type: dto.type,
        status: ResumeReviewStatus.PENDING,
      },
    });

    try {
      let aiResult: ResumeReviewAiResult;
      if (dto.type === ResumeReviewType.GENERAL) {
        aiResult = await this.ai.generateGeneralReview(aiInput);
      } else {
        aiResult = await this.ai.generateJobSpecificReview(
          aiInput,
          jobContext as ResumeReviewJobContext,
        );
      }

      const updated = await this.prisma.resumeReview.update({
        where: { id: review.id },
        data: ResumeReviewsService.completedReviewUpdate(aiResult),
      });

      await this.quota.recordSuccessfulAiResumeReview(user.userId);

      return ResumeReviewsService.toDto(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 4000) : 'Review failed';

      await this.prisma.resumeReview.update({
        where: { id: review.id },
        data: {
          status: ResumeReviewStatus.FAILED,
          errorMessage: message,
        },
      });

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      if (error instanceof AiInvocationError) {
        throw new BadGatewayException(error.message, { cause: error });
      }

      if (error instanceof StructuredResumeReviewValidationError) {
        throw new UnprocessableEntityException(error.message, {
          cause: error,
        });
      }

      throw new BadGatewayException('Resume review failed', { cause: error });
    }
  }

  async findAllForUser(
    user: CurrentUser,
    query: ResumeReviewsQueryDto,
  ): Promise<ResumeReviewResponseDto[]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const rows = await this.prisma.resumeReview.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return rows.map((row) => ResumeReviewsService.toDto(row));
  }

  async findOne(
    user: CurrentUser,
    reviewId: string,
  ): Promise<ResumeReviewResponseDto> {
    const row = await this.prisma.resumeReview.findFirst({
      where: { id: reviewId, userId: user.userId },
    });
    if (!row) {
      throw new NotFoundException('Resume review not found');
    }
    return ResumeReviewsService.toDto(row);
  }

  async findAllForResume(
    user: CurrentUser,
    resumeId: string,
  ): Promise<ResumeReviewResponseDto[]> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const rows = await this.prisma.resumeReview.findMany({
      where: { resumeId, userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ResumeReviewsService.toDto(row));
  }

  private static completedReviewUpdate(
    aiResult: ResumeReviewAiResult,
  ): Prisma.ResumeReviewUpdateInput {
    const structured = aiResult.structured;

    return {
      status: ResumeReviewStatus.COMPLETED,
      overallScore: structured.overallScore,
      atsScore: structured.atsScore ?? null,
      keywordScore: structured.keywordScore ?? null,
      structureScore: structured.structureScore ?? null,
      clarityScore: structured.clarityScore ?? null,
      strengths: structured.strengths as unknown as Prisma.InputJsonValue,
      weaknesses: structured.weaknesses as unknown as Prisma.InputJsonValue,
      missingKeywords:
        structured.missingKeywords as unknown as Prisma.InputJsonValue,
      suggestions: structured.suggestions as unknown as Prisma.InputJsonValue,
      improvedBullets:
        structured.improvedBullets !== undefined
          ? (structured.improvedBullets as unknown as Prisma.InputJsonValue)
          : ([] as unknown as Prisma.InputJsonValue),
      summary: structured.summary ?? null,
      rawAiOutput: {
        structured,
        providerPayload: aiResult.rawResponse,
      } as unknown as Prisma.InputJsonValue,
      errorMessage: null,
    };
  }

  static toDto(row: ResumeReview): ResumeReviewResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      resumeId: row.resumeId,
      applicationId: row.applicationId,
      jobId: row.jobId,
      type: row.type,
      overallScore: row.overallScore,
      atsScore: row.atsScore,
      keywordScore: row.keywordScore,
      structureScore: row.structureScore,
      clarityScore: row.clarityScore,
      strengths: ResumeReviewsService.jsonField(row.strengths),
      weaknesses: ResumeReviewsService.jsonField(row.weaknesses),
      missingKeywords: ResumeReviewsService.jsonField(row.missingKeywords),
      suggestions: ResumeReviewsService.jsonField(row.suggestions),
      improvedBullets: ResumeReviewsService.jsonField(row.improvedBullets),
      summary: row.summary,
      rawAiOutput: ResumeReviewsService.rawAiJson(row.rawAiOutput),
      status: row.status,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private static jsonField(
    value: Prisma.JsonValue | null,
  ): unknown[] | Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }
    return value as unknown[] | Record<string, unknown>;
  }

  private static rawAiJson(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}
