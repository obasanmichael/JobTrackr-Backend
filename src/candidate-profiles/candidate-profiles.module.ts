import { Module } from '@nestjs/common';
import { CandidateProfilesService } from './candidate-profiles.service';

@Module({
  providers: [CandidateProfilesService],
  exports: [CandidateProfilesService],
})
export class CandidateProfilesModule {}
