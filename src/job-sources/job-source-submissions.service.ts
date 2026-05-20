import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobSourceSubmissionStatus,
  type JobSourceSubmission,
} from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildJobSourceUpsertFromSubmission,
  findMatchingJobSourceForSubmission,
} from './build-job-source-from-submission';
import type { ApproveJobSourceSubmissionResponseDto } from './dto/approve-job-source-submission-response.dto';
import type { CreateJobSourceSubmissionDto } from './dto/create-job-source-submission.dto';
import type { JobSourceSubmissionResponseDto } from './dto/job-source-submission-response.dto';
import type { ReviewJobSourceSubmissionDto } from './dto/review-job-source-submission.dto';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import { JobSourcesService } from './job-sources.service';
import {
  normalizeCareersUrl,
  parseAtsCareersUrl,
} from './parse-ats-careers-url';

@Injectable()
export class JobSourceSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobSourcesService: JobSourcesService,
    private readonly jobIngestOrchestrationService: JobIngestOrchestrationService,
  ) {}

  async create(
    dto: CreateJobSourceSubmissionDto,
    options?: {
      submitterUser?: CurrentUser | null;
      submitterIp?: string | null;
    },
  ): Promise<JobSourceSubmissionResponseDto> {
    const careersUrl = normalizeCareersUrl(dto.careersUrl);
    const companyName = dto.companyName.trim();

    const pendingDuplicate = await this.prisma.jobSourceSubmission.findFirst({
      where: {
        careersUrl,
        status: JobSourceSubmissionStatus.PENDING,
      },
    });
    if (pendingDuplicate) {
      throw new ConflictException(
        'A pending submission already exists for this careers URL.',
      );
    }

    const detection = parseAtsCareersUrl(careersUrl);
    const row = await this.prisma.jobSourceSubmission.create({
      data: {
        companyName,
        careersUrl,
        submitterEmail: dto.submitterEmail?.trim() ?? null,
        submitterUserId: options?.submitterUser?.userId ?? null,
        submitterIp: options?.submitterIp?.trim() ?? null,
        detectedAtsType: detection.detectedAtsType,
        detectedSlug: detection.detectedSlug,
      },
    });

    return JobSourceSubmissionsService.toDto(row);
  }

  async listForAdmin(
    status: JobSourceSubmissionStatus = JobSourceSubmissionStatus.PENDING,
  ): Promise<JobSourceSubmissionResponseDto[]> {
    const rows = await this.prisma.jobSourceSubmission.findMany({
      where: { status },
      orderBy: [{ createdAt: 'asc' }],
    });
    return rows.map((row) => JobSourceSubmissionsService.toDto(row));
  }

  async approve(
    id: string,
    dto?: ReviewJobSourceSubmissionDto,
  ): Promise<ApproveJobSourceSubmissionResponseDto> {
    const submission = await this.requirePendingSubmission(id);
    const existingRows = await this.prisma.jobSource.findMany();
    const match = findMatchingJobSourceForSubmission(submission, existingRows);
    const upsert = buildJobSourceUpsertFromSubmission(submission);

    const jobSource = match
      ? await this.jobSourcesService.updateForAdmin(match.id, {
          name: upsert.name,
          type: upsert.type,
          baseUrl: upsert.baseUrl,
          isActive: upsert.isActive,
          config: upsert.config as Record<string, unknown>,
        })
      : await this.jobSourcesService.createForAdmin({
          name: upsert.name,
          type: upsert.type,
          baseUrl: upsert.baseUrl,
          isActive: upsert.isActive,
          config: upsert.config as Record<string, unknown>,
        });

    const reviewedAt = new Date();
    const updatedSubmission = await this.prisma.jobSourceSubmission.update({
      where: { id },
      data: {
        status: JobSourceSubmissionStatus.APPROVED,
        jobSourceId: jobSource.id,
        reviewerNotes: dto?.reviewerNotes?.trim() ?? null,
        reviewedAt,
      },
    });

    let sync: ApproveJobSourceSubmissionResponseDto['sync'] = null;
    if (upsert.isActive) {
      try {
        const result =
          await this.jobIngestOrchestrationService.syncExternalJobs(
            jobSource.id,
          );
        sync = {
          jobSourceId: jobSource.id,
          upsertedCount: result.upsertedCount,
          skippedInvalid: result.skippedInvalid,
          inactivatedCount: result.inactivatedCount,
          durationMs: result.durationMs,
          syncedAt: result.syncedAt,
        };
      } catch {
        sync = null;
      }
    }

    return {
      submission: JobSourceSubmissionsService.toDto(updatedSubmission),
      jobSource,
      sync,
    };
  }

  async reject(
    id: string,
    dto?: ReviewJobSourceSubmissionDto,
  ): Promise<JobSourceSubmissionResponseDto> {
    await this.requirePendingSubmission(id);
    const row = await this.prisma.jobSourceSubmission.update({
      where: { id },
      data: {
        status: JobSourceSubmissionStatus.REJECTED,
        reviewerNotes: dto?.reviewerNotes?.trim() ?? null,
        reviewedAt: new Date(),
      },
    });
    return JobSourceSubmissionsService.toDto(row);
  }

  async markSpam(
    id: string,
    dto?: ReviewJobSourceSubmissionDto,
  ): Promise<JobSourceSubmissionResponseDto> {
    await this.requirePendingSubmission(id);
    const row = await this.prisma.jobSourceSubmission.update({
      where: { id },
      data: {
        status: JobSourceSubmissionStatus.SPAM,
        reviewerNotes: dto?.reviewerNotes?.trim() ?? null,
        reviewedAt: new Date(),
      },
    });
    return JobSourceSubmissionsService.toDto(row);
  }

  private async requirePendingSubmission(
    id: string,
  ): Promise<JobSourceSubmission> {
    const submission = await this.prisma.jobSourceSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException('Job source submission not found');
    }
    if (submission.status !== JobSourceSubmissionStatus.PENDING) {
      throw new BadRequestException(
        `Submission is already ${submission.status.toLowerCase()}.`,
      );
    }
    return submission;
  }

  private static toDto(
    row: JobSourceSubmission,
  ): JobSourceSubmissionResponseDto {
    return {
      id: row.id,
      companyName: row.companyName,
      careersUrl: row.careersUrl,
      submitterEmail: row.submitterEmail,
      submitterUserId: row.submitterUserId,
      detectedAtsType: row.detectedAtsType,
      detectedSlug: row.detectedSlug,
      status: row.status,
      jobSourceId: row.jobSourceId,
      reviewerNotes: row.reviewerNotes,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
