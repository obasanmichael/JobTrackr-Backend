import {
  buildDuplicateContentHashSet,
  detectSalaryOutlier,
  evaluateExternalJobQuality,
  isValidApplicationUrl,
} from './external-job-quality.rules';
import { EXTERNAL_JOB_QUALITY_FLAGS } from './job-quality.constants';

describe('external-job-quality.rules', () => {
  it('validates application URLs', () => {
    expect(isValidApplicationUrl('https://jobs.example/1')).toBe(true);
    expect(isValidApplicationUrl('ftp://jobs.example/1')).toBe(false);
    expect(isValidApplicationUrl('')).toBe(false);
    expect(isValidApplicationUrl(null)).toBe(false);
  });

  it('detects salary outliers', () => {
    expect(detectSalaryOutlier(null, null)).toBe(false);
    expect(detectSalaryOutlier(100000, 150000)).toBe(false);
    expect(detectSalaryOutlier(-1, 100000)).toBe(true);
    expect(detectSalaryOutlier(200000, 100000)).toBe(true);
    expect(detectSalaryOutlier(100000, 1_000_000)).toBe(true);
  });

  it('flags missing URL, invalid URL, salary, and duplicate hash', () => {
    const rows = [
      {
        id: '1',
        applicationUrl: null,
        salaryMin: null,
        salaryMax: null,
        contentHash: 'dup',
      },
      {
        id: '2',
        applicationUrl: 'not-a-url',
        salaryMin: 200000,
        salaryMax: 100000,
        contentHash: 'dup',
      },
      {
        id: '3',
        applicationUrl: 'https://jobs.example/ok',
        salaryMin: 100000,
        salaryMax: 120000,
        contentHash: 'unique',
      },
    ];

    const duplicateHashes = buildDuplicateContentHashSet(rows);

    expect(evaluateExternalJobQuality(rows[0], duplicateHashes)).toEqual([
      EXTERNAL_JOB_QUALITY_FLAGS.MISSING_APPLICATION_URL,
      EXTERNAL_JOB_QUALITY_FLAGS.DUPLICATE_CONTENT_HASH,
    ]);
    expect(evaluateExternalJobQuality(rows[1], duplicateHashes)).toEqual([
      EXTERNAL_JOB_QUALITY_FLAGS.INVALID_APPLICATION_URL,
      EXTERNAL_JOB_QUALITY_FLAGS.SALARY_OUTLIER,
      EXTERNAL_JOB_QUALITY_FLAGS.DUPLICATE_CONTENT_HASH,
    ]);
    expect(evaluateExternalJobQuality(rows[2], duplicateHashes)).toEqual([]);
  });
});
