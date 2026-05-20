import {
  normalizeCareersUrl,
  parseAtsCareersUrl,
} from './parse-ats-careers-url';

describe('parseAtsCareersUrl', () => {
  it.each([
    [
      'https://boards.greenhouse.io/acme',
      { detectedAtsType: 'GREENHOUSE', detectedSlug: 'acme' },
    ],
    [
      'https://job-boards.greenhouse.io/acme/jobs/123',
      { detectedAtsType: 'GREENHOUSE', detectedSlug: 'acme' },
    ],
    [
      'https://jobs.lever.co/acme-corp',
      { detectedAtsType: 'LEVER', detectedSlug: 'acme-corp' },
    ],
    [
      'https://jobs.ashbyhq.com/acme',
      { detectedAtsType: 'ASHBY', detectedSlug: 'acme' },
    ],
    [
      'https://example.com/careers',
      { detectedAtsType: null, detectedSlug: null },
    ],
    [
      'not-a-url',
      { detectedAtsType: null, detectedSlug: null },
    ],
  ])('detects ATS from %s', (input, expected) => {
    expect(parseAtsCareersUrl(input)).toEqual(expected);
  });
});

describe('normalizeCareersUrl', () => {
  it('strips query, hash, and trailing slash', () => {
    expect(
      normalizeCareersUrl(
        'https://boards.greenhouse.io/acme/?gh_src=foo#section',
      ),
    ).toBe('https://boards.greenhouse.io/acme');
  });
});
