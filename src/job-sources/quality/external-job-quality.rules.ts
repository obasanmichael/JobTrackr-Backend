import {
  EXTERNAL_JOB_QUALITY_FLAGS,
  JOB_QUALITY_SALARY_MAX_USD,
  type ExternalJobQualityFlag,
} from './job-quality.constants';

export type ExternalJobQualityInput = {
  id: string;
  applicationUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  contentHash: string | null;
};

export function isValidApplicationUrl(
  value: string | null | undefined,
): boolean {
  if (!value?.trim()) {
    return false;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectSalaryOutlier(
  salaryMin: number | null,
  salaryMax: number | null,
  currency: string | null = 'USD',
  maxAllowed = JOB_QUALITY_SALARY_MAX_USD,
): boolean {
  const values = [salaryMin, salaryMax].filter(
    (value): value is number => value != null && Number.isFinite(value),
  );

  if (values.length === 0) {
    return false;
  }

  if (values.some((value) => value < 0)) {
    return true;
  }

  // The max threshold is denominated in USD; a normal salary in e.g. INR or
  // ZAR would trip it. Only apply the ceiling to USD (or unknown) currencies.
  const usdComparable =
    currency == null || currency.trim().toUpperCase() === 'USD';
  if (usdComparable && values.some((value) => value > maxAllowed)) {
    return true;
  }

  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    return true;
  }

  return false;
}

export function buildDuplicateContentHashSet(
  rows: Pick<ExternalJobQualityInput, 'contentHash'>[],
): Set<string> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const hash = row.contentHash?.trim();
    if (!hash) {
      continue;
    }
    counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([hash]) => hash),
  );
}

export function evaluateExternalJobQuality(
  job: ExternalJobQualityInput,
  duplicateHashes: Set<string>,
): ExternalJobQualityFlag[] {
  const flags: ExternalJobQualityFlag[] = [];

  if (!job.applicationUrl?.trim()) {
    flags.push(EXTERNAL_JOB_QUALITY_FLAGS.MISSING_APPLICATION_URL);
  } else if (!isValidApplicationUrl(job.applicationUrl)) {
    flags.push(EXTERNAL_JOB_QUALITY_FLAGS.INVALID_APPLICATION_URL);
  }

  if (detectSalaryOutlier(job.salaryMin, job.salaryMax, job.currency)) {
    flags.push(EXTERNAL_JOB_QUALITY_FLAGS.SALARY_OUTLIER);
  }

  const hash = job.contentHash?.trim();
  if (hash && duplicateHashes.has(hash)) {
    flags.push(EXTERNAL_JOB_QUALITY_FLAGS.DUPLICATE_CONTENT_HASH);
  }

  return flags;
}

export function qualityFlagsFromJson(value: unknown): ExternalJobQualityFlag[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is ExternalJobQualityFlag => typeof item === 'string',
  );
}
