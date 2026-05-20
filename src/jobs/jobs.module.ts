import { Module } from '@nestjs/common';
import { JobMatchingModule } from '../job-matching/job-matching.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule, JobMatchingModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
