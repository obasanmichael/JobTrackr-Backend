import { JobSourceType } from '@prisma/client';
import {
  buildJobSourceUpsertFromSubmission,
  findMatchingJobSourceForSubmission,
} from './build-job-source-from-submission';

describe('buildJobSourceUpsertFromSubmission', () => {
  const base = {
    id: 'sub-1',
    companyName: 'Acme',
    careersUrl: 'https://boards.greenhouse.io/acme',
  };

  it('builds Greenhouse ingest config when detected', () => {
    const upsert = buildJobSourceUpsertFromSubmission({
      ...base,
      detectedAtsType: 'GREENHOUSE',
      detectedSlug: 'acme',
    });

    expect(upsert.type).toBe(JobSourceType.ATS_FEED);
    expect(upsert.isActive).toBe(true);
    expect(upsert.baseUrl).toBe('https://boards.greenhouse.io/acme');
    expect(upsert.config).toMatchObject({
      provider: 'GREENHOUSE',
      board_token: 'acme',
      submissionId: 'sub-1',
    });
  });

  it('builds inactive Ashby row until connector exists', () => {
    const upsert = buildJobSourceUpsertFromSubmission({
      ...base,
      careersUrl: 'https://jobs.ashbyhq.com/acme',
      detectedAtsType: 'ASHBY',
      detectedSlug: 'acme',
    });

    expect(upsert.isActive).toBe(false);
    expect(upsert.config).toMatchObject({
      provider: 'ASHBY',
      orgSlug: 'acme',
    });
  });

  it('falls back to manual inactive source when ATS is unknown', () => {
    const upsert = buildJobSourceUpsertFromSubmission({
      ...base,
      careersUrl: 'https://example.com/careers',
      detectedAtsType: null,
      detectedSlug: null,
    });

    expect(upsert.type).toBe(JobSourceType.MANUAL);
    expect(upsert.isActive).toBe(false);
  });
});

describe('findMatchingJobSourceForSubmission', () => {
  it('matches by company name or careers URL in config', () => {
    const submission = {
      id: 'sub-1',
      companyName: 'Acme',
      careersUrl: 'https://boards.greenhouse.io/acme',
    };

    const byName = findMatchingJobSourceForSubmission(submission, [
      {
        id: 'src-1',
        name: 'Acme',
        type: JobSourceType.ATS_FEED,
        baseUrl: null,
        isActive: true,
        requiresApiKey: false,
        lastSyncAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const byUrl = findMatchingJobSourceForSubmission(submission, [
      {
        id: 'src-2',
        name: 'Other',
        type: JobSourceType.ATS_FEED,
        baseUrl: null,
        isActive: true,
        requiresApiKey: false,
        lastSyncAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        config: { careersUrl: submission.careersUrl },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(byName?.id).toBe('src-1');
    expect(byUrl?.id).toBe('src-2');
  });
});
