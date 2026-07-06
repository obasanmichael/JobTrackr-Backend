jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ExternalJobEmploymentType, JobSourceType } from '@prisma/client';
import { parseGenericJobListing } from '../normalization/generic-job-listing.schema';
import {
  AdzunaJobSourceSyncProvider,
  mapAdzunaJobToGenericListing,
  readAdzunaSourceConfig,
} from './adzuna-job-source-sync.provider';

import adzunaFixture from './fixtures/adzuna-search-sample.json';

const fixtureResults = (
  adzunaFixture as { results: Record<string, unknown>[] }
).results;

describe('Adzuna ingest', () => {
  const sourceRow = (config: unknown = { provider: 'ADZUNA', country: 'gb' }) => ({
    id: '00000000-0000-0000-a000-000000000007',
    name: 'Adzuna UK',
    type: JobSourceType.API,
    baseUrl: null,
    requiresApiKey: true,
    isActive: true,
    config: config as never,
  });

  const configService = (env: Record<string, string | undefined>) =>
    ({
      get: (key: string) => env[key],
    }) as unknown as ConfigService;

  describe('mapAdzunaJobToGenericListing', () => {
    it('maps a canonical result and strips <strong> highlights', () => {
      const mapped = mapAdzunaJobToGenericListing(fixtureResults[0], 'gb');
      const parsed = parseGenericJobListing(mapped);
      expect(parsed.ok).toBe(true);

      expect(mapped.externalJobId).toBe('5088148098');
      expect(mapped.title).toBe('Registered Pharmacist - Community Pharmacy');
      expect(mapped.company).toBe('Boots UK');
      expect(mapped.location).toBe('Manchester, Greater Manchester');
      expect(mapped.country).toBe('GB');
      expect(mapped.applicationUrl).toContain('adzuna.co.uk/jobs/land/ad');
      expect(mapped.salaryMin).toBe(42000);
      expect(mapped.salaryMax).toBe(48001);
      expect(mapped.currency).toBe('GBP');
      expect(mapped.employmentType).toBe(ExternalJobEmploymentType.FULL_TIME);
      expect(mapped.postedAt?.toISOString()).toBe('2026-07-01T09:15:30.000Z');
      expect(mapped.description).not.toContain('<strong>');
    });

    it('drops predicted salaries, tolerates missing company and bad dates', () => {
      const mapped = mapAdzunaJobToGenericListing(fixtureResults[1], 'gb');

      expect(mapped.salaryMin).toBeUndefined();
      expect(mapped.salaryMax).toBeUndefined();
      expect(mapped.currency).toBeUndefined();
      expect(mapped.postedAt).toBeUndefined();
      expect(mapped.employmentType).toBe(ExternalJobEmploymentType.CONTRACT);

      // No company name → fails generic validation and is skipped by ingest.
      expect(mapped.company).toBe('');
      expect(parseGenericJobListing(mapped).ok).toBe(false);
    });
  });

  describe('readAdzunaSourceConfig', () => {
    it('reads country, optional filters, and clamps paging knobs', () => {
      const cfg = readAdzunaSourceConfig(
        sourceRow({
          provider: 'ADZUNA',
          country: 'GB',
          what: ' nurse ',
          category: 'healthcare-nursing-jobs',
          max_pages: 999,
          results_per_page: 500,
        }),
      );
      expect(cfg.country).toBe('gb');
      expect(cfg.what).toBe('nurse');
      expect(cfg.category).toBe('healthcare-nursing-jobs');
      expect(cfg.maxPages).toBe(20);
      expect(cfg.resultsPerPage).toBe(50);
    });

    it('rejects unsupported countries', () => {
      expect(() =>
        readAdzunaSourceConfig(sourceRow({ provider: 'ADZUNA', country: 'ng' })),
      ).toThrow(/supported set/);
    });
  });

  describe('fetchSnapshot', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('throws when credentials are missing', async () => {
      const provider = new AdzunaJobSourceSyncProvider(configService({}));
      await expect(provider.fetchSnapshot(sourceRow())).rejects.toThrow(
        /ADZUNA_APP_ID/,
      );
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('fetches pages until a short page and maps results', async () => {
      const provider = new AdzunaJobSourceSyncProvider(
        configService({ ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key' }),
      );
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: adzunaFixture });

      const snapshot = await provider.fetchSnapshot(sourceRow());

      expect(axios.get).toHaveBeenCalledTimes(1);
      const [url, options] = (axios.get as jest.Mock).mock.calls[0] as [
        string,
        { params: Record<string, unknown> },
      ];
      expect(url).toBe('https://api.adzuna.com/v1/api/jobs/gb/search/1');
      expect(options.params.app_id).toBe('id');
      expect(options.params.sort_by).toBe('date');

      expect(snapshot.rawListings).toHaveLength(2);
      const first = snapshot.rawListings[0] as { externalJobId: string };
      expect(first.externalJobId).toBe('5088148098');
    });

    it('throws on a payload without results array', async () => {
      const provider = new AdzunaJobSourceSyncProvider(
        configService({ ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key' }),
      );
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { nope: true } });

      await expect(provider.fetchSnapshot(sourceRow())).rejects.toThrow(
        /missing results array/,
      );
    });
  });
});
