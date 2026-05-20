import { Module } from '@nestjs/common';
import { JobMatchingService } from './job-matching.service';
import { MatchesController } from './matches.controller';

@Module({
  controllers: [MatchesController],
  providers: [JobMatchingService],
  exports: [JobMatchingService],
})
export class JobMatchingModule {}
