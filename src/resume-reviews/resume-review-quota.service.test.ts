import { ResumeReviewQuotaService } from './resume-review-quota.service';

describe('ResumeReviewQuotaService.resolveMonthlySuccessLimit', () => {
  it('treats blank, -1, and unlimited as unlimited', () => {
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit(undefined),
    ).toBeNull();
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('')).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('   '),
    ).toBeNull();
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('-1')).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('unlimited'),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('UnLimited'),
    ).toBeNull();
  });

  it('parses positive digit strings', () => {
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('1')).toBe(1);
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('42')).toBe(42);
  });

  it('returns null for invalid values', () => {
    expect(ResumeReviewQuotaService.resolveMonthlySuccessLimit('0')).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('01'),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('-2'),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('3.5'),
    ).toBeNull();
    expect(
      ResumeReviewQuotaService.resolveMonthlySuccessLimit('abc'),
    ).toBeNull();
  });
});
