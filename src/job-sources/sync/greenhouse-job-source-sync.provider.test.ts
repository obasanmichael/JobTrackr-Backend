jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import axios from 'axios';
import {
  GreenhouseJobSourceSyncProvider,
  mapGreenhouseJobToGenericListing,
} from './greenhouse-job-source-sync.provider';
import { JobSourceType } from '@prisma/client';
import { parseGenericJobListing } from '../normalization/generic-job-listing.schema';

import greenhouseFixture from './fixtures/greenhouse-list-jobs-sample.json';

describe('Greenhouse ingest', () => {
  const sourceRow = () => ({
    id: '00000000-0000-0000-a000-000000000003',
    name: 'Fallback Co',
    type: JobSourceType.API,
    baseUrl: null,
    requiresApiKey: false,
    isActive: true,
    config: { board_token: 'example_board' },
  });

  describe('mapGreenhouseJobToGenericListing', () => {
    it('parses canonical Unity-style fields into generic schema', () => {
      const job = (greenhouseFixture as { jobs: Record<string, unknown>[] })
        .jobs[0];
      const mapped = mapGreenhouseJobToGenericListing(job, 'Ignored');
      const parsed = parseGenericJobListing(mapped);
      expect(parsed.ok).toBe(true);

      expect(mapped.externalJobId).toBe('7776598');
      expect(mapped.title).toBe('Accountant');
      expect(mapped.company).toBe('Example Corp');
      expect(mapped.location).toBe('Bengaluru, India');
      expect(mapped.applicationUrl).toContain('7776598');
    });

    it('falls company back to source name when company_name absent', () => {
      const mapped = mapGreenhouseJobToGenericListing(
        {
          id: 1,
          title: 'T',
          absolute_url: 'https://jobs.example/1',
        },
        'Source Display Name ',
      );

      expect(mapped.company).toBe('Source Display Name');

      expect(parseGenericJobListing(mapped).ok).toBe(true);
    });

    it('throws config errors from provider when token missing', async () => {
      const provider = new GreenhouseJobSourceSyncProvider();
      await expect(
        provider.fetchSnapshot({
          ...sourceRow(),
          config: {},
        }),
      ).rejects.toThrow(/board_token/i);
    });
  });

  describe('GreenhouseJobSourceSyncProvider.fetchSnapshot', () => {
    beforeEach(() => {
      (axios as jest.Mocked<typeof axios>).get.mockReset();
    });

    it('requests board jobs and emits generic listings', async () => {
      (axios as jest.Mocked<typeof axios>).get.mockResolvedValueOnce({
        data: greenhouseFixture,
      });

      const provider = new GreenhouseJobSourceSyncProvider();
      const result = await provider.fetchSnapshot(sourceRow());

      // eslint-disable-next-line @typescript-eslint/unbound-method -- `axios.get` replaced by jest mock
      const mockedGet = (axios as jest.Mocked<typeof axios>).get;
      expect(mockedGet.mock.calls).toHaveLength(1);
      expect(mockedGet.mock.calls[0]?.[0]).toBe(
        'https://boards-api.greenhouse.io/v1/boards/example_board/jobs',
      );
      expect(mockedGet.mock.calls[0]?.[1]).toMatchObject({ params: {} });

      expect(result.rawListings).toHaveLength(1);

      expect(parseGenericJobListing(result.rawListings[0]).ok).toBe(true);
    });
  });
});
