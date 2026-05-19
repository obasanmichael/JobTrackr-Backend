import { Injectable } from '@nestjs/common';
import type { ResumeReviewStructuredOutput } from './resume-review-structured-output.schema';
import type {
  ResumeReviewAiInput,
  ResumeReviewAiPort,
  ResumeReviewAiResult,
  ResumeReviewJobContext,
} from './resume-review-ai.port';

const MOCK_STRUCTURED_GENERAL: ResumeReviewStructuredOutput = {
  overallScore: 78,
  atsScore: 72,
  keywordScore: 70,
  structureScore: 80,
  clarityScore: 76,
  strengths: ['Clear technical signals', 'Readable layout'],
  weaknesses: ['Limited quantified outcomes'],
  missingKeywords: ['CI/CD', 'Kubernetes'],
  suggestions: [
    {
      section: 'Experience',
      issue: 'Bullets describe tasks without impact',
      recommendation:
        'Add metrics (latency, adoption, revenue) and stronger action verbs.',
    },
  ],
  improvedBullets: [
    'Reduced API latency by 35% through caching and query tuning.',
  ],
  summary:
    'Solid baseline resume; prioritize measurable wins and ATS keywords.',
};

@Injectable()
export class MockResumeReviewAiProvider implements ResumeReviewAiPort {
  async generateGeneralReview(
    input: ResumeReviewAiInput,
  ): Promise<ResumeReviewAiResult> {
    void input;
    return {
      structured: { ...MOCK_STRUCTURED_GENERAL },
      rawResponse: { provider: 'mock', variant: 'GENERAL' },
    };
  }

  async generateJobSpecificReview(
    input: ResumeReviewAiInput,
    job: ResumeReviewJobContext,
  ): Promise<ResumeReviewAiResult> {
    void input;
    const roleHint =
      job.applicationJobTitle ?? job.externalJobId ?? 'target role';

    return {
      structured: {
        ...MOCK_STRUCTURED_GENERAL,
        overallScore: 74,
        summary: `Tailored emphasis for ${roleHint}: align bullets with stated stack and responsibilities.`,
        missingKeywords: [
          ...MOCK_STRUCTURED_GENERAL.missingKeywords,
          'domain fit',
        ],
      },
      rawResponse: { provider: 'mock', variant: 'JOB_SPECIFIC', job },
    };
  }
}
