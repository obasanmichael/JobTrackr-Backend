import { JobSourceType, Prisma, type JobSource } from '@prisma/client';
import type { JobSourceSubmission } from '@prisma/client';
import type { JobSourceSeedUpsertInput } from './seed/job-source-seeder';

export function readSubmissionIdFromConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }
  const submissionId = (config as Record<string, unknown>).submissionId;
  return typeof submissionId === 'string' && submissionId.trim()
    ? submissionId.trim()
    : null;
}

export function findMatchingJobSourceForSubmission(
  submission: Pick<JobSourceSubmission, 'id' | 'companyName' | 'careersUrl'>,
  existingRows: JobSource[],
): JobSource | undefined {
  const normalizedUrl = submission.careersUrl.trim().toLowerCase();

  return existingRows.find((row) => {
    if (row.name === submission.companyName.trim()) {
      return true;
    }

    if (
      !row.config ||
      typeof row.config !== 'object' ||
      Array.isArray(row.config)
    ) {
      return false;
    }

    const config = row.config as Record<string, unknown>;
    if (readSubmissionIdFromConfig(config) === submission.id) {
      return true;
    }

    const configUrl = config.careersUrl;
    return (
      typeof configUrl === 'string' &&
      configUrl.trim().toLowerCase() === normalizedUrl
    );
  });
}

export function buildJobSourceUpsertFromSubmission(
  submission: Pick<
    JobSourceSubmission,
    'id' | 'companyName' | 'careersUrl' | 'detectedAtsType' | 'detectedSlug'
  >,
): JobSourceSeedUpsertInput {
  const slug = submission.detectedSlug?.trim() ?? null;
  const atsType = submission.detectedAtsType?.trim().toUpperCase() ?? null;

  const sharedConfig: Record<string, unknown> = {
    submissionId: submission.id,
    careersUrl: submission.careersUrl,
    sourceStatus: 'ACTIVE',
  };

  if (atsType === 'GREENHOUSE' && slug) {
    return {
      name: submission.companyName.trim(),
      type: JobSourceType.ATS_FEED,
      baseUrl: `https://boards.greenhouse.io/${slug}`,
      isActive: true,
      config: {
        ...sharedConfig,
        provider: 'GREENHOUSE',
        board_token: slug,
      },
    };
  }

  if (atsType === 'LEVER' && slug) {
    return {
      name: submission.companyName.trim(),
      type: JobSourceType.ATS_FEED,
      baseUrl: `https://jobs.lever.co/${slug}`,
      isActive: true,
      config: {
        ...sharedConfig,
        provider: 'LEVER',
        site: slug,
      },
    };
  }

  if (atsType === 'ASHBY' && slug) {
    return {
      name: submission.companyName.trim(),
      type: JobSourceType.ATS_FEED,
      baseUrl: `https://jobs.ashbyhq.com/${slug}`,
      isActive: false,
      config: {
        ...sharedConfig,
        provider: 'ASHBY',
        orgSlug: slug,
        sourceStatus: 'CANDIDATE',
      },
    };
  }

  return {
    name: submission.companyName.trim(),
    type: JobSourceType.MANUAL,
    baseUrl: submission.careersUrl,
    isActive: false,
    config: {
      ...sharedConfig,
      sourceStatus: 'CANDIDATE',
    },
  };
}
