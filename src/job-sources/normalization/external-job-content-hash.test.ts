import {
  computeExternalJobContentHash,
  normalizeContentHashApplicationUrl,
  normalizeContentHashText,
} from './external-job-content-hash';

describe('external-job-content-hash', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeContentHashText('  Senior   Engineer  ')).toBe(
      'senior engineer',
    );
  });

  it('normalizes application URLs', () => {
    expect(
      normalizeContentHashApplicationUrl(
        'https://Jobs.Example.com/apply/123/#section',
      ),
    ).toBe('https://jobs.example.com/apply/123');
  });

  it('returns stable hash for equivalent listings', () => {
    const a = computeExternalJobContentHash({
      title: 'Software Engineer',
      company: 'Acme',
      location: 'London, UK',
      applicationUrl: 'https://jobs.example.com/1/',
    });
    const b = computeExternalJobContentHash({
      title: '  software   engineer ',
      company: 'acme',
      location: 'london, uk',
      applicationUrl: 'https://jobs.example.com/1',
    });

    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes hash when apply URL changes', () => {
    const base = {
      title: 'PM',
      company: 'Acme',
      location: 'Remote',
    } as const;

    const first = computeExternalJobContentHash({
      ...base,
      applicationUrl: 'https://jobs.example.com/a',
    });
    const second = computeExternalJobContentHash({
      ...base,
      applicationUrl: 'https://jobs.example.com/b',
    });

    expect(first).not.toBe(second);
  });
});
