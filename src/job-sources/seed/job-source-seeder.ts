import { JobSourceType, Prisma, type JobSource } from '@prisma/client';
import type {
  LaunchEmployerSeedRow,
  LaunchEmployersSeedFile,
} from './launch-employer-seed.schema';

export type JobSourceSeedUpsertInput = {
  name: string;
  type: JobSourceType;
  baseUrl: string | null;
  isActive: boolean;
  config: Prisma.InputJsonValue;
};

export type JobSourceSeedResult = {
  seedKey: string;
  companyName: string;
  action: 'created' | 'updated' | 'skipped';
  jobSourceId?: string;
  reason?: string;
};

export type JobSourceSeedSummary = {
  created: number;
  updated: number;
  skipped: number;
  results: JobSourceSeedResult[];
};

export function isActiveFromSourceStatus(
  status: LaunchEmployerSeedRow['sourceStatus'],
): boolean {
  return status === 'ACTIVE';
}

export function buildJobSourceConfigFromEmployer(
  employer: LaunchEmployerSeedRow,
): Record<string, unknown> {
  const providerConfig =
    employer.atsType === 'GREENHOUSE'
      ? {
          provider: 'GREENHOUSE',
          board_token: employer.boardToken!.trim(),
        }
      : {
          provider: 'LEVER',
          site: employer.site!.trim(),
        };

  return {
    ...providerConfig,
    seedKey: employer.seedKey,
    launchMarkets: employer.launchMarkets,
    roleFamilies: employer.roleFamilies,
    sourceStatus: employer.sourceStatus,
    priority: employer.priority,
    careersUrl: employer.careersUrl,
    ...(employer.notes ? { notes: employer.notes } : {}),
  };
}

export function buildJobSourceUpsertInput(
  employer: LaunchEmployerSeedRow,
): JobSourceSeedUpsertInput {
  const config = buildJobSourceConfigFromEmployer(employer);
  const baseUrl =
    employer.atsType === 'GREENHOUSE'
      ? `https://boards.greenhouse.io/${employer.boardToken!.trim()}`
      : `https://jobs.lever.co/${employer.site!.trim()}`;

  return {
    name: employer.companyName,
    type: JobSourceType.ATS_FEED,
    baseUrl,
    isActive: isActiveFromSourceStatus(employer.sourceStatus),
    config: config as Prisma.InputJsonValue,
  };
}

export function readSeedKeyFromConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }
  const seedKey = (config as Record<string, unknown>).seedKey;
  return typeof seedKey === 'string' && seedKey.trim() ? seedKey.trim() : null;
}

export function findMatchingJobSource(
  employer: LaunchEmployerSeedRow,
  existingRows: JobSource[],
): JobSource | undefined {
  return existingRows.find((row) => {
    if (row.name === employer.companyName) {
      return true;
    }
    return readSeedKeyFromConfig(row.config) === employer.seedKey;
  });
}

export function planJobSourceSeed(
  seedFile: LaunchEmployersSeedFile,
  existingRows: JobSource[],
  options?: { includeStatuses?: LaunchEmployerSeedRow['sourceStatus'][] },
): Array<{
  employer: LaunchEmployerSeedRow;
  existing?: JobSource;
  upsert: JobSourceSeedUpsertInput;
}> {
  const allowed =
    options?.includeStatuses ??
    (['ACTIVE', 'CANDIDATE', 'PAUSED'] as LaunchEmployerSeedRow['sourceStatus'][]);

  return seedFile.employers
    .filter((employer) => allowed.includes(employer.sourceStatus))
    .map((employer) => ({
      employer,
      existing: findMatchingJobSource(employer, existingRows),
      upsert: buildJobSourceUpsertInput(employer),
    }));
}

export function summarizeSeedResults(
  results: JobSourceSeedResult[],
): JobSourceSeedSummary {
  return {
    created: results.filter((r) => r.action === 'created').length,
    updated: results.filter((r) => r.action === 'updated').length,
    skipped: results.filter((r) => r.action === 'skipped').length,
    results,
  };
}
