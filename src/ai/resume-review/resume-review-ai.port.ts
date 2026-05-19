import type { ResumeReviewStructuredOutput } from './resume-review-structured-output.schema';

export type ResumeReviewAiInput = {
  resumeParsedText: string;
  resumeSummary?: string | null;
  candidateHeadline?: string | null;
};

export type ResumeReviewJobContext = {
  applicationJobTitle?: string | null;
  applicationCompany?: string | null;
  applicationNotes?: string | null;
  jobDescription?: string | null;
  externalJobId?: string | null;
};

export type ResumeReviewAiResult = {
  structured: ResumeReviewStructuredOutput;
  rawResponse: unknown;
};

export interface ResumeReviewAiPort {
  generateGeneralReview(
    input: ResumeReviewAiInput,
  ): Promise<ResumeReviewAiResult>;

  generateJobSpecificReview(
    input: ResumeReviewAiInput,
    job: ResumeReviewJobContext,
  ): Promise<ResumeReviewAiResult>;
}
