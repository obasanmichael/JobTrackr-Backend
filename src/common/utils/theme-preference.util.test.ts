import { isValidThemePreference } from './theme-preference.util';

describe('theme-preference.util', () => {
  it('accepts valid theme values', () => {
    expect(isValidThemePreference('system')).toBe(true);
    expect(isValidThemePreference('light')).toBe(true);
    expect(isValidThemePreference('dark')).toBe(true);
  });

  it('rejects invalid theme values', () => {
    expect(isValidThemePreference('neon')).toBe(false);
  });
});
