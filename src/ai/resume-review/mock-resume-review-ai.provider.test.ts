import { MockResumeReviewAiProvider } from './mock-resume-review-ai.provider';

describe('MockResumeReviewAiProvider', () => {
  const provider = new MockResumeReviewAiProvider();

  it('returns validated-shaped GENERAL payload', async () => {
    const result = await provider.generateGeneralReview({
      resumeParsedText: 'hello world',
    });
    expect(result.structured.overallScore).toBe(78);
    expect(result.rawResponse).toMatchObject({ provider: 'mock' });
  });

  it('adjusts JOB_SPECIFIC summary hint', async () => {
    const result = await provider.generateJobSpecificReview(
      { resumeParsedText: 'hello world' },
      { applicationJobTitle: 'Staff Engineer' },
    );
    expect(result.structured.summary).toContain('Staff Engineer');
    expect(result.structured.overallScore).toBe(74);
  });
});
