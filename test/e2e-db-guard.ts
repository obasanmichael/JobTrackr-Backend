import 'dotenv/config';

/**
 * The e2e suites call `deleteMany()` on core tables between tests, which
 * destroys whatever database DATABASE_URL points at. Refuse to run against
 * anything that is not an explicitly local/disposable database.
 */
export default function guardE2eDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('E2E guard: DATABASE_URL is missing or not a valid URL.');
  }

  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const explicitlyAllowed = process.env.E2E_ALLOW_DB_WIPE === 'true';

  if (!isLocal && !explicitlyAllowed) {
    throw new Error(
      `E2E guard: refusing to run destructive e2e tests against non-local database host "${host}". ` +
        'Point DATABASE_URL at a disposable local Postgres (e.g. docker) for e2e runs, ' +
        'or set E2E_ALLOW_DB_WIPE=true if you really mean it.',
    );
  }
}
