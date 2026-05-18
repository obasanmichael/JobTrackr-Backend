import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';

/**
 * Resume AI review HTTP API and orchestration (V2B.2+).
 */
@Module({
  imports: [AiModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ResumeReviewsModule {}
