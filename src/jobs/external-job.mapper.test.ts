import { ExternalJobRemoteType, JobSourceType } from '@prisma/client';
import { mapExternalJobToListingDto } from './external-job.mapper';

describe('external-job.mapper', () => {
  const baseRow = {
    id: '22222222-2222-2222-8222-222222222222',
    sourceId: '11111111-1111-1111-8111-111111111111',
    sourceName: 'Legacy Source Name',
    externalJobId: 'gh-1',
    title: 'Software Engineer',
    company: 'Acme',
    location: 'Remote',
    country: 'US',
    remoteType: ExternalJobRemoteType.REMOTE,
    salaryMin: null,
    salaryMax: null,
    currency: 'USD',
    description: 'Build things.',
    requirements: null,
    employmentType: 'FULL_TIME' as const,
    experienceLevel: 'SENIOR' as const,
    applicationUrl: 'https://jobs.example/acme/1',
    postedAt: new Date('2026-05-01T00:00:00.000Z'),
    expiresAt: null,
    rawPayload: {},
    contentHash: 'abc',
    isActive: true,
    isSuspicious: false,
    qualityFlags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('maps sourceMeta when JobSource relation is included', () => {
    const dto = mapExternalJobToListingDto({
      ...baseRow,
      source: {
        name: 'Demo Greenhouse',
        type: JobSourceType.ATS_FEED,
      },
    });

    expect(dto.source).toBe('Demo Greenhouse');
    expect(dto.sourceMeta).toEqual({
      name: 'Demo Greenhouse',
      type: JobSourceType.ATS_FEED,
    });
  });

  it('omits sourceMeta when source type is unavailable', () => {
    const dto = mapExternalJobToListingDto(baseRow);

    expect(dto.source).toBe('Legacy Source Name');
    expect(dto.sourceMeta).toBeNull();
  });
});
