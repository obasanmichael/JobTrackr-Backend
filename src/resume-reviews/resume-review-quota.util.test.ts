import { utcMonthPeriodKey } from './resume-review-quota.util';

describe('utcMonthPeriodKey', () => {
  it('formats UTC month bucket', () => {
    expect(
      utcMonthPeriodKey(new Date(Date.UTC(2026, 4, 18, 12, 0, 0))),
    ).toBe('2026-05');
    expect(
      utcMonthPeriodKey(new Date(Date.UTC(2026, 0, 1, 0, 0, 0))),
    ).toBe('2026-01');
  });
});
