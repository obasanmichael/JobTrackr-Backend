import { isValidIanaTimezone } from './iana-timezone.util';

describe('isValidIanaTimezone', () => {
  it('accepts valid IANA identifiers', () => {
    expect(isValidIanaTimezone('America/New_York')).toBe(true);
    expect(isValidIanaTimezone('UTC')).toBe(true);
    expect(isValidIanaTimezone('Europe/London')).toBe(true);
  });

  it('rejects invalid identifiers', () => {
    expect(isValidIanaTimezone('Not/A/Timezone')).toBe(false);
    expect(isValidIanaTimezone('')).toBe(false);
    expect(isValidIanaTimezone('   ')).toBe(false);
  });
});
