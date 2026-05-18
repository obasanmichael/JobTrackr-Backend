import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResumeLocalStorageService } from './resume-local.storage';

@Module({
  imports: [ConfigModule],
  providers: [ResumeLocalStorageService],
  exports: [ResumeLocalStorageService],
})
export class StorageModule {}
