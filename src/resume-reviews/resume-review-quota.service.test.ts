import { ResumeReviewQuotaService } from './resume-review-quota.service';

describe('ResumeReviewQuotaService.resolveMonthlySuccessLimit', () => {
  it('honours entitlement limit when set (numeric)', () => {
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('-1', 3)).toBe(
      3,
    );
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit(undefined, 0),
    ).toBe(0);
  });

  it('treats blank, -1, and unlimited env as unlimited when entitlement not set', () => {
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit(undefined, undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('   ', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('-1', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit(
        'unlimited',
        undefined,
      ),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit(
        'UnLimited',
        undefined,
      ),
    ).toBeNull();
  });

  it('parses positive digit strings when entitlement unset', () => {
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('1', undefined),
    ).toBe(1);
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('42', undefined),
    ).toBe(42);
  });

  it('returns null for invalid env values when entitlement unset', () => {
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('0', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('01', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('-2', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('3.5', undefined),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('abc', undefined),
    ).toBeNull();
  });
});
