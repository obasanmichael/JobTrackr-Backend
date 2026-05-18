import { z } from 'zod';

export class StructuredResumeReviewParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StructuredResumeReviewParseError';
  }
}

export class StructuredResumeReviewValidationError extends Error {
  readonly zodError: z.ZodError;

  constructor(zodError: z.ZodError) {
    super(zodError.message);
    this.name = 'StructuredResumeReviewValidationError';
    this.zodError = zodError;
  }
}

export const resumeReviewSuggestionSchema = z.object({
  section: z.string().min(1),
  issue: z.string().min(1),
  recommendation: z.string().min(1),
});

/** Parsed AI payload validated before persisting (PRD §7.2 + §5.2 scoring fields). */
export const resumeReviewStructuredOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  atsScore: z.number().int().min(0).max(100).optional(),
  keywordScore: z.number().int().min(0).max(100).optional(),
  structureScore: z.number().int().min(0).max(100).optional(),
  clarityScore: z.number().int().min(0).max(100).optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestions: z.array(resumeReviewSuggestionSchema),
  improvedBullets: z.array(z.string()).optional(),
  summary: z.string().optional(),
});

export type ResumeReviewStructuredOutput = z.infer<
  typeof resumeReviewStructuredOutputSchema
>;

export function extractJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced) {
      try {
        return JSON.parse(fenced);
      } catch {
        // fall through to brace slice
      }
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch (cause) {
        throw new StructuredResumeReviewParseError(
          'Could not parse JSON object from model response',
          { cause },
        );
      }
    }

    throw new StructuredResumeReviewParseError(
      'Model response did not contain parseable JSON',
    );
  }
}

export function validateStructuredResumeReviewOutput(
  raw: unknown,
): ResumeReviewStructuredOutput {
  const result = resumeReviewStructuredOutputSchema.safeParse(raw);
  if (!result.success) {
    throw new StructuredResumeReviewValidationError(result.error);
  }
  return result.data;
}

export function parseStructuredResumeReviewFromModelText(
  text: string,
): ResumeReviewStructuredOutput {
  const raw = extractJsonFromModelText(text);
  return validateStructuredResumeReviewOutput(raw);
}
