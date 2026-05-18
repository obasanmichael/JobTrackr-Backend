import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { ResumeReviewsController } from './resume-reviews.controller';
import { ResumeReviewQuotaService } from './resume-review-quota.service';
import { ResumeReviewsService } from './resume-reviews.service';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [ResumeReviewsController],
  providers: [ResumeReviewQuotaService, ResumeReviewsService],
  exports: [ResumeReviewsService],
})
export class ResumeReviewsModule {}
