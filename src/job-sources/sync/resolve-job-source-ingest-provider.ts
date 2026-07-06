/** Which concrete ATS ingest adapter handles a JobSource row. */
export type JobSourceIngestProviderKind = 'GREENHOUSE' | 'LEVER' | 'ADZUNA';

/**
 * Pick an ingest implementation from **`JobSource.config`**.
 * Prefer explicit **`provider`** (also accepts **`ingestProvider`**) ;
 * otherwise infer Greenhouse vs Lever from **`board_token`** vs **`site`** slugs.
 */
export function resolveJobSourceIngestProvider(
  config: unknown,
): JobSourceIngestProviderKind | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }
  const c = config as Record<string, unknown>;
  const explicitRaw = c.provider ?? c.ingestProvider;
  if (typeof explicitRaw === 'string') {
    switch (explicitRaw.trim().toUpperCase()) {
      case 'GREENHOUSE':
        return 'GREENHOUSE';
      case 'LEVER':
        return 'LEVER';
      case 'ADZUNA':
        return 'ADZUNA';
      default:
        return null;
    }
  }
  if (typeof c.board_token === 'string' && c.board_token.trim()) {
    return 'GREENHOUSE';
  }
  if (typeof c.site === 'string' && c.site.trim()) {
    return 'LEVER';
  }
  return null;
}
