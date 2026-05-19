import { parseGenericJobListing } from './generic-job-listing.schema';

describe('parseGenericJobListing', () => {
  it('parses minimal valid payload', () => {
    const out = parseGenericJobListing({
      externalJobId: 'gh-001',
      title: 'Senior Engineer',
      company: 'Acme',
      applicationUrl: 'https://acme.example/apply',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.externalJobId).toBe('gh-001');
      expect(out.value.title).toBe('Senior Engineer');
    }
  });

  it('rejects malformed payload', () => {
    expect(parseGenericJobListing({ title: 'x' }).ok).toBe(false);
  });
});
