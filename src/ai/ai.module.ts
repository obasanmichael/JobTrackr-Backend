import { Module } from '@nestjs/common';

/**
 * AI provider wiring (resume review, matching, etc.) lands in V2B.2+.
 * Shell module so resume-reviews can depend on a stable import boundary.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class AiModule {}
