export const EXTERNAL_JOB_QUALITY_FLAGS = {
  MISSING_APPLICATION_URL: 'MISSING_APPLICATION_URL',
  INVALID_APPLICATION_URL: 'INVALID_APPLICATION_URL',
  SALARY_OUTLIER: 'SALARY_OUTLIER',
  DUPLICATE_CONTENT_HASH: 'DUPLICATE_CONTENT_HASH',
} as const;

export type ExternalJobQualityFlag =
  (typeof EXTERNAL_JOB_QUALITY_FLAGS)[keyof typeof EXTERNAL_JOB_QUALITY_FLAGS];

const configuredSalaryMax = Number(
  process.env.JOB_QUALITY_SALARY_MAX_USD ?? '500000',
);

export const JOB_QUALITY_SALARY_MAX_USD =
  Number.isFinite(configuredSalaryMax) && configuredSalaryMax > 0
    ? configuredSalaryMax
    : 500_000;

const configuredFailureAlert = Number(
  process.env.JOB_SOURCE_CONSECUTIVE_FAILURE_ALERT_THRESHOLD ?? '3',
);

export const JOB_SOURCE_CONSECUTIVE_FAILURE_ALERT_THRESHOLD =
  Number.isFinite(configuredFailureAlert) && configuredFailureAlert > 0
    ? configuredFailureAlert
    : 3;

const configuredRetentionDays = Number(
  process.env.EXTERNAL_JOB_INACTIVE_RETENTION_DAYS ?? '90',
);

export const EXTERNAL_JOB_INACTIVE_RETENTION_DAYS =
  Number.isFinite(configuredRetentionDays) && configuredRetentionDays > 0
    ? configuredRetentionDays
    : 90;

export function isExternalJobPurgeEnabled(): boolean {
  const raw = process.env.EXTERNAL_JOB_PURGE_ENABLED?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}
