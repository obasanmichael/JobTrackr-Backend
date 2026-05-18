import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiInvocationError } from './ai-invocation.error';
import { parseStructuredResumeReviewFromModelText } from './resume-review-structured-output.schema';
import type {
  ResumeReviewAiInput,
  ResumeReviewAiPort,
  ResumeReviewAiResult,
  ResumeReviewJobContext,
} from './resume-review-ai.port';

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  error?: { message?: string };
};

const SYSTEM_PROMPT = `You are an expert resume coach and ATS-aware reviewer.
Respond with a single JSON object only (no prose outside JSON). Keys required:
- overallScore: integer 0-100
- atsScore: integer 0-100 (optional but preferred)
- keywordScore: integer 0-100 (optional)
- structureScore: integer 0-100 (optional)
- clarityScore: integer 0-100 (optional)
- strengths: string[]
- weaknesses: string[]
- missingKeywords: string[]
- suggestions: array of objects with keys section, issue, recommendation (all strings)
- improvedBullets: string[] (optional)
- summary: string (optional short recap)

Scores must be integers. Arrays may be empty only if truly nothing applies.`;

@Injectable()
export class OpenAiResumeReviewAiProvider implements ResumeReviewAiPort {
  constructor(private readonly configService: ConfigService) {}

  async generateGeneralReview(input: ResumeReviewAiInput): Promise<ResumeReviewAiResult> {
    const userPrompt = this.buildGeneralUserPrompt(input);
    return this.completeStructured(userPrompt);
  }

  async generateJobSpecificReview(
    input: ResumeReviewAiInput,
    job: ResumeReviewJobContext,
  ): Promise<ResumeReviewAiResult> {
    const userPrompt = `${this.buildGeneralUserPrompt(input)}

Job context for tailoring:
${this.formatJobContext(job)}`;

    return this.completeStructured(userPrompt);
  }

  private buildGeneralUserPrompt(input: ResumeReviewAiInput): string {
    const lines: string[] = ['Review this resume text and produce the JSON schema described.'];

    if (input.candidateHeadline) {
      lines.push(`Candidate headline: ${input.candidateHeadline}`);
    }
    if (input.resumeSummary) {
      lines.push(`Candidate summary (may overlap resume): ${input.resumeSummary}`);
    }

    lines.push('');
    lines.push('Resume text:');
    lines.push(input.resumeParsedText.trim());

    return lines.join('\n');
  }

  private formatJobContext(job: ResumeReviewJobContext): string {
    const parts: string[] = [];
    if (job.applicationJobTitle) {
      parts.push(`Title: ${job.applicationJobTitle}`);
    }
    if (job.applicationCompany) {
      parts.push(`Company: ${job.applicationCompany}`);
    }
    if (job.applicationNotes) {
      parts.push(`Notes: ${job.applicationNotes}`);
    }
    if (job.jobDescription) {
      parts.push(`Job description:\n${job.jobDescription}`);
    }
    if (job.externalJobId) {
      parts.push(`External job id (opaque): ${job.externalJobId}`);
    }
    return parts.join('\n');
  }

  private async completeStructured(userPrompt: string): Promise<ResumeReviewAiResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new AiInvocationError(
        'OPENAI_API_KEY is missing while AI_PROVIDER is openai',
      );
    }

    const baseUrl = OpenAiResumeReviewAiProvider.normalizeBaseUrl(
      this.configService.get<string>('OPENAI_BASE_URL') ??
        'https://api.openai.com/v1',
    );
    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ?? 'gpt-4o-mini';
    const timeoutMs = Number(
      this.configService.get<string>('AI_RESUME_REVIEW_TIMEOUT_MS') ?? '60000',
    );

    const url = `${baseUrl}/chat/completions`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal:
          Number.isFinite(timeoutMs) && timeoutMs > 0
            ? AbortSignal.timeout(timeoutMs)
            : undefined,
      });
    } catch (cause) {
      throw new AiInvocationError('OpenAI request failed', { cause });
    }

    const rawBody = await response.text();
    let parsedBody: ChatCompletionResponse;
    try {
      parsedBody = JSON.parse(rawBody) as ChatCompletionResponse;
    } catch (cause) {
      throw new AiInvocationError(
        `OpenAI returned non-JSON (HTTP ${response.status})`,
        { cause },
      );
    }

    if (!response.ok) {
      const msg =
        parsedBody.error?.message ?? rawBody.slice(0, 500) ?? response.statusText;
      throw new AiInvocationError(`OpenAI error HTTP ${response.status}: ${msg}`);
    }

    const content = parsedBody.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new AiInvocationError('OpenAI returned an empty message content');
    }

    try {
      const structured = parseStructuredResumeReviewFromModelText(content);
      return {
        structured,
        rawResponse: parsedBody,
      };
    } catch (cause) {
      throw new AiInvocationError(
        'OpenAI JSON failed structured resume review validation',
        { cause },
      );
    }
  }

  private static normalizeBaseUrl(raw: string): string {
    return raw.replace(/\/+$/, '');
  }
}
