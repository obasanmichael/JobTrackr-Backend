import { buildStaleExternalJobWhere } from './deactivate-stale-external-jobs';

describe('deactivate-stale-external-jobs', () => {
  it('deactivates all active rows when snapshot is empty', () => {
    expect(buildStaleExternalJobWhere('source-1', [])).toEqual({
      sourceId: 'source-1',
      isActive: true,
    });
  });

  it('excludes seen external job ids from stale selection', () => {
    expect(buildStaleExternalJobWhere('source-1', ['a', 'b'])).toEqual({
      sourceId: 'source-1',
      isActive: true,
      externalJobId: { notIn: ['a', 'b'] },
    });
  });
});
