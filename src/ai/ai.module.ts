import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockResumeReviewAiProvider } from './resume-review/mock-resume-review-ai.provider';
import { OpenAiResumeReviewAiProvider } from './resume-review/openai-resume-review-ai.provider';
import type { ResumeReviewAiPort } from './resume-review/resume-review-ai.port';
import { RESUME_REVIEW_AI_PORT } from './resume-review/resume-review-ai.tokens';

@Module({
  providers: [
    MockResumeReviewAiProvider,
    OpenAiResumeReviewAiProvider,
    {
      provide: RESUME_REVIEW_AI_PORT,
      useFactory: (
        config: ConfigService,
        mock: MockResumeReviewAiProvider,
        openai: OpenAiResumeReviewAiProvider,
      ): ResumeReviewAiPort => {
        const mode = (config.get<string>('AI_PROVIDER') ?? 'mock').toLowerCase();
        return mode === 'openai' ? openai : mock;
      },
      inject: [
        ConfigService,
        MockResumeReviewAiProvider,
        OpenAiResumeReviewAiProvider,
      ],
    },
  ],
  exports: [RESUME_REVIEW_AI_PORT],
})
export class AiModule {}
