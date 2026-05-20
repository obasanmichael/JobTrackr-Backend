import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JobSourceType } from '@prisma/client';
import type { JobSource } from '@prisma/client';
import {
  buildJobSourceConfigFromEmployer,
  buildJobSourceUpsertInput,
  findMatchingJobSource,
  isActiveFromSourceStatus,
  planJobSourceSeed,
  readSeedKeyFromConfig,
} from './job-source-seeder';
import {
  parseLaunchEmployersSeedFile,
  type LaunchEmployerSeedRow,
} from './launch-employer-seed.schema';

describe('launch-employer-seed.schema', () => {
  it('parses the committed launch employers seed file', () => {
    const raw = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'data/launch-employers.seed.json'),
        'utf8',
      ),
    ) as unknown;

    const parsed = parseLaunchEmployersSeedFile(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.employers.length).toBeGreaterThanOrEqual(30);
    }
  });
});

const greenhouseEmployer: LaunchEmployerSeedRow = {
  seedKey: 'stripe',
  companyName: 'Stripe',
  careersUrl: 'https://stripe.com/jobs',
  atsType: 'GREENHOUSE',
  boardToken: 'stripe',
  launchMarkets: ['US', 'GB'],
  roleFamilies: ['Software Engineering', 'Product Management'],
  sourceStatus: 'ACTIVE',
  priority: 1,
};

describe('job-source-seeder', () => {
  it('maps ACTIVE status to isActive', () => {
    expect(isActiveFromSourceStatus('ACTIVE')).toBe(true);
    expect(isActiveFromSourceStatus('CANDIDATE')).toBe(false);
    expect(isActiveFromSourceStatus('PAUSED')).toBe(false);
  });

  it('builds Greenhouse config with launch metadata', () => {
    const config = buildJobSourceConfigFromEmployer(greenhouseEmployer);

    expect(config).toEqual(
      expect.objectContaining({
        provider: 'GREENHOUSE',
        board_token: 'stripe',
        seedKey: 'stripe',
        launchMarkets: ['US', 'GB'],
        sourceStatus: 'ACTIVE',
        priority: 1,
        careersUrl: 'https://stripe.com/jobs',
      }),
    );
  });

  it('builds upsert input with ATS base URL', () => {
    const input = buildJobSourceUpsertInput(greenhouseEmployer);

    expect(input.name).toBe('Stripe');
    expect(input.type).toBe(JobSourceType.ATS_FEED);
    expect(input.isActive).toBe(true);
    expect(input.baseUrl).toBe('https://boards.greenhouse.io/stripe');
  });

  it('matches existing rows by seedKey or company name', () => {
    const existing = [
      {
        id: '1',
        name: 'Other Co',
        config: { seedKey: 'stripe' },
      },
      {
        id: '2',
        name: 'Stripe',
        config: null,
      },
    ] as JobSource[];

    expect(findMatchingJobSource(greenhouseEmployer, existing)?.id).toBe('1');

    const byName = findMatchingJobSource(
      { ...greenhouseEmployer, seedKey: 'stripe-new' },
      [{ id: '2', name: 'Stripe', config: null } as JobSource],
    );
    expect(byName?.id).toBe('2');
  });

  it('plans create/update rows from seed file', () => {
    const plans = planJobSourceSeed(
      { version: 1, employers: [greenhouseEmployer] },
      [],
    );

    expect(plans).toHaveLength(1);
    expect(plans[0].existing).toBeUndefined();
    expect(plans[0].upsert.name).toBe('Stripe');
  });

  it('reads seedKey from config JSON', () => {
    expect(readSeedKeyFromConfig({ seedKey: 'monzo' })).toBe('monzo');
    expect(readSeedKeyFromConfig(null)).toBeNull();
  });
});
