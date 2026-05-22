export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isValidThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function normalizeThemePreference(
  value: string | null | undefined,
): ThemePreference {
  if (value && isValidThemePreference(value)) {
    return value;
  }
  return 'system';
}
