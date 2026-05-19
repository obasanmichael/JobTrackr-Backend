import { resolveJobSourceIngestProvider } from './resolve-job-source-ingest-provider';

describe('resolveJobSourceIngestProvider', () => {
  it('infers GREENHOUSE when board_token is set', () => {
    expect(
      resolveJobSourceIngestProvider({ board_token: 'acme-careers ' }),
    ).toBe('GREENHOUSE');
  });

  it('infers LEVER when site slug is set', () => {
    expect(resolveJobSourceIngestProvider({ site: 'leverdemo ' })).toBe(
      'LEVER',
    );
  });

  it('explicit provider overrides inference', () => {
    expect(
      resolveJobSourceIngestProvider({
        provider: 'lever',
        board_token: 'ignored',
      }),
    ).toBe('LEVER');
  });

  it('accepts ingestProvider alias', () => {
    expect(
      resolveJobSourceIngestProvider({ ingestProvider: 'GREENHOUSE' }),
    ).toBe('GREENHOUSE');
  });

  it('returns null for unknown explicit provider strings', () => {
    expect(
      resolveJobSourceIngestProvider({ provider: 'ASHBY_NOT_WIRED_YET' }),
    ).toBeNull();
    expect(
      resolveJobSourceIngestProvider({ provider: '', site: '' }),
    ).toBeNull();
  });

  it('returns null when config absent or malformed', () => {
    expect(resolveJobSourceIngestProvider(undefined)).toBeNull();
    expect(resolveJobSourceIngestProvider([])).toBeNull();
    expect(resolveJobSourceIngestProvider(null)).toBeNull();
    expect(resolveJobSourceIngestProvider({})).toBeNull();
  });
});
