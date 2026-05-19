jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import axios from 'axios';
import { JobSourceType, ExternalJobRemoteType } from '@prisma/client';
import {
  LeverJobSourceSyncProvider,
  mapLeverPostingToGenericListing,
} from './lever-job-source-sync.provider';
import { parseGenericJobListing } from '../normalization/generic-job-listing.schema';

describe('Lever ingest', () => {
  describe('mapLeverPostingToGenericListing', () => {
    it('maps demo-like posting payloads', () => {
      const posting = {
        id: '33538a2f-d27d-4a96-8f05-fa4b0e4d940e',
        text: 'Demo Engineer ',
        hostedUrl: 'https://jobs.lever.co/demo',
        applyUrl: 'https://jobs.lever.co/demo/apply',
        categories: {
          location: 'Arlington, TX',
          commitment: 'Internship',
        },
        workplaceType: 'remote',
        country: 'US',
        createdAt: 1553186035299,
        descriptionPlain: 'Hello lever',
        salaryRange: {
          min: 60000,
          max: 90000,
          currency: 'USD',
          interval: 'per-year-salary',
        },
      };

      const mapped = mapLeverPostingToGenericListing(posting, 'Lever Demo');
      const parsed = parseGenericJobListing(mapped);
      expect(parsed.ok).toBe(true);
      expect(mapped.externalJobId).toBe('33538a2f-d27d-4a96-8f05-fa4b0e4d940e');
      expect(mapped.title).toBe('Demo Engineer');
      expect(mapped.company).toBe('Lever Demo');
      expect(mapped.remoteType).toBe(ExternalJobRemoteType.REMOTE);
      expect(mapped.salaryMin).toBe(60000);
      expect(mapped.currency).toBe('USD');
    });
  });

  describe('LeverJobSourceSyncProvider.fetchSnapshot', () => {
    beforeEach(() => {
      (axios as jest.Mocked<typeof axios>).get.mockReset();
    });

    it('paginates skip until receiving a short batch', async () => {
      const page = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        text: `Role ${i}`,
        hostedUrl: `https://example.com/${i}`,
      }));
      (axios as jest.Mocked<typeof axios>).get
        .mockResolvedValueOnce({ data: page })
        .mockResolvedValueOnce({
          data: [{ id: 'c', text: 'C', hostedUrl: 'https://example.com/c' }],
        });

      const provider = new LeverJobSourceSyncProvider();
      const rows = await provider.fetchSnapshot({
        id: '00000000-0000-0000-a001-000000000001',
        name: 'Co',
        type: JobSourceType.API,
        baseUrl: null,
        requiresApiKey: false,
        isActive: true,
        config: { site: 'acme' },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- `axios.get` replaced by jest mock
      const mockedGet = (axios as jest.Mocked<typeof axios>).get;
      expect(mockedGet.mock.calls).toHaveLength(2);

      expect(rows.rawListings).toHaveLength(101);
    });
  });
});
