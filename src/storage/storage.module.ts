import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResumeLocalStorageService } from './resume-local.storage';
import { R2StorageService } from './r2.storage';

@Module({
  imports: [ConfigModule],
  providers: [ResumeLocalStorageService, R2StorageService],
  exports: [ResumeLocalStorageService, R2StorageService],
})
export class StorageModule {}
