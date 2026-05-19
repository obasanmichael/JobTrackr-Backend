import {
  extractJsonFromModelText,
  resumeReviewStructuredOutputSchema,
  StructuredResumeReviewValidationError,
  validateStructuredResumeReviewOutput,
} from './resume-review-structured-output.schema';

describe('resumeReviewStructuredOutputSchema', () => {
  it('accepts a minimal valid payload', () => {
    const raw = {
      overallScore: 80,
      strengths: ['a'],
      weaknesses: ['b'],
      missingKeywords: [],
      suggestions: [
        {
          section: 'Experience',
          issue: 'x',
          recommendation: 'y',
        },
      ],
    };

    expect(() => validateStructuredResumeReviewOutput(raw)).not.toThrow();
    expect(resumeReviewStructuredOutputSchema.safeParse(raw).success).toBe(
      true,
    );
  });

  it('rejects invalid score bounds', () => {
    expect(() =>
      validateStructuredResumeReviewOutput({
        overallScore: 101,
        strengths: [],
        weaknesses: [],
        missingKeywords: [],
        suggestions: [],
      }),
    ).toThrow(StructuredResumeReviewValidationError);
  });

  it('parses fenced JSON from model text', () => {
    const text =
      'Here:\n```json\n{"overallScore":50,"strengths":[],"weaknesses":[],"missingKeywords":[],"suggestions":[]}\n```';
    const structured = validateStructuredResumeReviewOutput(
      extractJsonFromModelText(text),
    );
    expect(structured.overallScore).toBe(50);
  });
});
