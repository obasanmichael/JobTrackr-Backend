import { ExternalJobRemoteType } from '@prisma/client';
import { mapExternalListingToCreateApplicationDto } from './map-external-job-to-create-application';

describe('mapExternalListingToCreateApplicationDto', () => {
  it('maps remote type and trims notes aggregate', () => {
    const dto = mapExternalListingToCreateApplicationDto(
      {
        title: 'Senior Dev',
        company: 'Corp',
        applicationUrl: 'https://corp.jobs/a',
        location: 'Lagos',
        remoteType: ExternalJobRemoteType.REMOTE,
        salaryMin: 120_000,
        salaryMax: 180_000,
        currency: 'USD',
      },
      { savedNotes: ' Saved note ', notesAppend: ' More ' },
    );
    expect(dto.jobTitle).toBe('Senior Dev');
    expect(dto.companyName).toBe('Corp');
    expect(dto.workMode).toBe('REMOTE');
    expect(dto.jobUrl).toBe('https://corp.jobs/a');
    expect(dto.notes).toContain('Saved note');
    expect(dto.notes).toContain('More');
    expect(dto.source).toBe('COMPANY_WEBSITE');
    expect(dto.status).toBe('SAVED');
  });

  it('omits malformed job urls', () => {
    const dto = mapExternalListingToCreateApplicationDto({
      title: 'T',
      company: 'C',
      applicationUrl: 'javascript:alert(1)',
      location: null,
      remoteType: ExternalJobRemoteType.UNSPECIFIED,
      salaryMin: null,
      salaryMax: null,
      currency: null,
    });
    expect(dto.jobUrl).toBeUndefined();
  });
});
