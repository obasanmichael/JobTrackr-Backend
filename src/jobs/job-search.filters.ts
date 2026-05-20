import type { Prisma } from '@prisma/client';
import {
  ExternalExperienceLevel,
  ExternalJobRemoteType,
  WorkMode,
} from '@prisma/client';
import type { JobSearchQueryDto } from './dto/job-search-query.dto';

const KEYWORD_SEARCH_FIELDS = ['title', 'company', 'description'] as const;

export function remoteTypeToWorkMode(
  remoteType: ExternalJobRemoteType,
): WorkMode {
  switch (remoteType) {
    case ExternalJobRemoteType.REMOTE:
      return WorkMode.REMOTE;
    case ExternalJobRemoteType.HYBRID:
      return WorkMode.HYBRID;
    case ExternalJobRemoteType.ONSITE:
      return WorkMode.ONSITE;
    default:
      return WorkMode.UNSPECIFIED;
  }
}

export function workModeToRemoteType(workMode: WorkMode): ExternalJobRemoteType {
  switch (workMode) {
    case WorkMode.REMOTE:
      return ExternalJobRemoteType.REMOTE;
    case WorkMode.HYBRID:
      return ExternalJobRemoteType.HYBRID;
    case WorkMode.ONSITE:
      return ExternalJobRemoteType.ONSITE;
    default:
      return ExternalJobRemoteType.UNSPECIFIED;
  }
}

export function buildJobSearchWhere(
  query: JobSearchQueryDto,
): Prisma.ExternalJobWhereInput {
  const where: Prisma.ExternalJobWhereInput = {
    isActive: true,
  };

  const keyword = query.q?.trim();
  if (keyword) {
    where.OR = KEYWORD_SEARCH_FIELDS.map((field) => ({
      [field]: { contains: keyword, mode: 'insensitive' as const },
    }));
  }

  const location = query.location?.trim();
  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (query.workMode) {
    where.remoteType = workModeToRemoteType(query.workMode);
  }

  if (query.experienceLevel) {
    where.experienceLevel = query.experienceLevel;
  }

  if (query.salaryMin !== undefined) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { salaryMax: { gte: query.salaryMin } },
          { salaryMin: { gte: query.salaryMin } },
        ],
      },
    ];
  }

  const source = query.source?.trim();
  if (source) {
    where.sourceName = { contains: source, mode: 'insensitive' };
  }

  if (query.postedWithin) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - query.postedWithin);
    where.postedAt = { gte: since };
  }

  return where;
}

export function buildJobExcerpt(description: string | null | undefined): string | null {
  if (!description?.trim()) {
    return null;
  }
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 240) {
    return normalized;
  }
  return `${normalized.slice(0, 237)}...`;
}
