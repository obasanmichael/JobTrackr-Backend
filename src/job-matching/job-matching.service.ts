import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CandidateProfile,
  ExternalJob,
  JobMatchResult,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import {
  mapExternalJobToListingDto,
  type ExternalJobListingRow,
} from '../jobs/external-job.mapper';
import { externalJobPublicInclude } from '../jobs/external-job-public.select';
import { PrismaService } from '../prisma/prisma.service';
import type {
  JobMatchItemDto,
  JobMatchListResponseDto,
  JobSingleMatchResponseDto,
} from './dto/job-match-response.dto';
import {
  jobInputFromExternalJob,
  profileInputFromRecord,
  scoreJobMatch,
} from './job-match-scoring';
import {
  MATCH_CACHE_TTL_MS,
  MATCH_JOB_POOL_SIZE,
  MATCH_RESULT_LIMIT,
} from './matches.constants';

@Injectable()
export class JobMatchingService {
  private readonly logger = new Logger(JobMatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listMatches(
    user: CurrentUser,
    options?: { forceRefresh?: boolean },
  ): Promise<JobMatchListResponseDto> {
    const profile = await this.resolveProfileForUser(user.userId);
    if (!profile) {
      return {
        matches: [],
        total: 0,
        requiresProfile: true,
        generatedAt: null,
      };
    }

    if (!options?.forceRefresh) {
      const cached = await this.tryLoadFreshCache(user.userId, profile);
      if (cached) {
        return cached;
      }
    }

    return this.generateAndPersistMatches(user.userId, profile);
  }

  async generateMatches(user: CurrentUser): Promise<JobMatchListResponseDto> {
    const profile = await this.resolveProfileForUser(user.userId);
    if (!profile) {
      throw new ConflictException(
        'Upload and parse a resume before generating job matches.',
      );
    }

    return this.generateAndPersistMatches(user.userId, profile);
  }

  async matchJobForUser(
    user: CurrentUser,
    externalJobId: string,
  ): Promise<JobSingleMatchResponseDto> {
    const profile = await this.resolveProfileForUser(user.userId);
    const job = await this.prisma.externalJob.findFirst({
      where: { id: externalJobId, isActive: true, isSuspicious: false },
      include: externalJobPublicInclude,
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!profile) {
      return {
        requiresProfile: true,
        overallScore: 0,
        matchReason: 'Upload and parse a resume to see match details.',
        matchedSkills: [],
        missingSkills: [],
        titleScore: 0,
        skillScore: 0,
        experienceScore: 0,
        locationScore: 0,
        recencyScore: 0,
        job: mapExternalJobToListingDto(job),
      };
    }

    const scored = this.scoreExternalJob(profile, job);
    await this.persistMatchRows(user.userId, profile, [scored]);

    return {
      requiresProfile: false,
      ...scored,
    };
  }

  private async tryLoadFreshCache(
    userId: string,
    profile: CandidateProfile,
  ): Promise<JobMatchListResponseDto | null> {
    const rows = await this.prisma.jobMatchResult.findMany({
      where: { userId },
      include: { externalJob: { include: externalJobPublicInclude } },
      orderBy: [{ overallScore: 'desc' }, { updatedAt: 'desc' }],
      take: MATCH_RESULT_LIMIT,
    });

    if (rows.length === 0) {
      return null;
    }

    const latest = rows.reduce(
      (max, row) => (row.updatedAt > max ? row.updatedAt : max),
      rows[0].updatedAt,
    );

    const cacheFresh = Date.now() - latest.getTime() < MATCH_CACHE_TTL_MS;
    const profileFresh = profile.updatedAt <= latest;

    if (!cacheFresh || !profileFresh) {
      return null;
    }

    return {
      matches: rows
        .filter((row) => row.externalJob.isActive)
        .map((row) => this.toMatchItemDto(row, row.externalJob)),
      total: rows.length,
      requiresProfile: false,
      generatedAt: latest,
    };
  }

  private async generateAndPersistMatches(
    userId: string,
    profile: CandidateProfile,
  ): Promise<JobMatchListResponseDto> {
    const jobs = await this.prisma.externalJob.findMany({
      where: { isActive: true, isSuspicious: false },
      include: externalJobPublicInclude,
      orderBy: [{ postedAt: 'desc' }, { updatedAt: 'desc' }],
      take: MATCH_JOB_POOL_SIZE,
    });

    this.logger.log(
      `Regenerating matches for user=${userId} poolSize=${jobs.length} resultLimit=${MATCH_RESULT_LIMIT}`,
    );

    const scored = jobs
      .map((job) => this.scoreExternalJob(profile, job))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, MATCH_RESULT_LIMIT);

    await this.persistMatchRows(userId, profile, scored);

    return {
      matches: scored,
      total: scored.length,
      requiresProfile: false,
      generatedAt: new Date(),
    };
  }

  private scoreExternalJob(
    profile: CandidateProfile,
    job: ExternalJobListingRow,
  ): JobMatchItemDto {
    const breakdown = scoreJobMatch(
      profileInputFromRecord(profile),
      jobInputFromExternalJob(job),
    );

    return {
      ...breakdown,
      job: mapExternalJobToListingDto(job),
    };
  }

  private async persistMatchRows(
    userId: string,
    profile: CandidateProfile,
    rows: JobMatchItemDto[],
  ): Promise<void> {
    const externalJobIds = rows.map((row) => row.job.id);

    await this.prisma.$transaction([
      this.prisma.jobMatchResult.deleteMany({
        where: {
          userId,
          ...(externalJobIds.length > 0
            ? { externalJobId: { notIn: externalJobIds } }
            : {}),
        },
      }),
      ...rows.map((row) =>
        this.prisma.jobMatchResult.upsert({
          where: {
            userId_externalJobId: {
              userId,
              externalJobId: row.job.id,
            },
          },
          create: JobMatchingService.buildUpsertData(userId, profile, row),
          update: JobMatchingService.buildUpsertData(userId, profile, row),
        }),
      ),
    ]);
  }

  private static buildUpsertData(
    userId: string,
    profile: CandidateProfile,
    row: JobMatchItemDto,
  ): Prisma.JobMatchResultUncheckedCreateInput {
    return {
      userId,
      resumeId: profile.resumeId,
      candidateProfileId: profile.id,
      externalJobId: row.job.id,
      overallScore: row.overallScore,
      titleScore: row.titleScore,
      skillScore: row.skillScore,
      experienceScore: row.experienceScore,
      locationScore: row.locationScore,
      recencyScore: row.recencyScore,
      matchedSkills: row.matchedSkills,
      missingSkills: row.missingSkills,
      matchReason: row.matchReason,
    };
  }

  private toMatchItemDto(
    row: JobMatchResult,
    job: ExternalJobListingRow,
  ): JobMatchItemDto {
    return {
      overallScore: row.overallScore,
      matchReason: row.matchReason,
      matchedSkills: JobMatchingService.stringArrayFromJson(row.matchedSkills),
      missingSkills: JobMatchingService.stringArrayFromJson(row.missingSkills),
      titleScore: row.titleScore,
      skillScore: row.skillScore,
      experienceScore: row.experienceScore,
      locationScore: row.locationScore,
      recencyScore: row.recencyScore,
      job: mapExternalJobToListingDto(job),
    };
  }

  private static stringArrayFromJson(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private async resolveProfileForUser(
    userId: string,
  ): Promise<CandidateProfile | null> {
    const activeResume = await this.prisma.resume.findFirst({
      where: { userId, isActive: true, status: 'PARSED' },
      include: { candidateProfile: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (activeResume?.candidateProfile) {
      return activeResume.candidateProfile;
    }

    const confirmed = await this.prisma.candidateProfile.findFirst({
      where: { userId, isConfirmed: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (confirmed) {
      return confirmed;
    }

    return this.prisma.candidateProfile.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
