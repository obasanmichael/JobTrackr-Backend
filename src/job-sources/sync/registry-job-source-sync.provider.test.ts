import { RegistryJobSourceSyncProvider } from './registry-job-source-sync.provider';
import { GreenhouseJobSourceSyncProvider } from './greenhouse-job-source-sync.provider';
import { LeverJobSourceSyncProvider } from './lever-job-source-sync.provider';
import { NoopJobSourceSyncProvider } from './noop-job-source-sync.provider';
import { JobSourceType } from '@prisma/client';

describe('RegistryJobSourceSyncProvider', () => {
  const source = (
    overrides: Partial<{ config: Record<string, unknown> | null }> = {},
  ) => ({
    id: '00000000-0000-0000-a004-000000000004',
    name: 'N',
    type: JobSourceType.API,
    baseUrl: null,
    requiresApiKey: false,
    isActive: true,
    config: null,
    ...overrides,
  });

  let noop: jest.Mocked<Pick<NoopJobSourceSyncProvider, 'fetchSnapshot'>>;
  let gh: jest.Mocked<Pick<GreenhouseJobSourceSyncProvider, 'fetchSnapshot'>>;
  let lev: jest.Mocked<Pick<LeverJobSourceSyncProvider, 'fetchSnapshot'>>;

  beforeEach(() => {
    noop = {
      fetchSnapshot: jest.fn().mockResolvedValue({ rawListings: ['noop'] }),
    };
    gh = {
      fetchSnapshot: jest.fn().mockResolvedValue({ rawListings: ['gh'] }),
    };
    lev = {
      fetchSnapshot: jest.fn().mockResolvedValue({ rawListings: ['lv'] }),
    };
  });

  it('delegates to Greenhouse when board_token resolves', async () => {
    const registry = new RegistryJobSourceSyncProvider(noop, gh, lev);

    await registry.fetchSnapshot(
      source({ config: { board_token: 't' } }) as Parameters<
        RegistryJobSourceSyncProvider['fetchSnapshot']
      >[0],
    );

    expect(gh.fetchSnapshot).toHaveBeenCalled();
    expect(noop.fetchSnapshot).not.toHaveBeenCalled();
  });

  it('delegates to Lever when site slug resolves', async () => {
    const registry = new RegistryJobSourceSyncProvider(noop, gh, lev);

    await registry.fetchSnapshot(
      source({
        config: { site: 'demo' },
      }) as Parameters<RegistryJobSourceSyncProvider['fetchSnapshot']>[0],
    );

    expect(lev.fetchSnapshot).toHaveBeenCalled();
    expect(noop.fetchSnapshot).not.toHaveBeenCalled();
  });

  it('falls back to noop when provider unknown', async () => {
    const registry = new RegistryJobSourceSyncProvider(noop, gh, lev);

    await registry.fetchSnapshot(
      source({
        config: { provider: 'ASHBY_WAITLIST' },
      }) as Parameters<RegistryJobSourceSyncProvider['fetchSnapshot']>[0],
    );

    expect(noop.fetchSnapshot).toHaveBeenCalled();
    expect(gh.fetchSnapshot).not.toHaveBeenCalled();
  });
});
