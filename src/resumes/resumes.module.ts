import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ResumeDocumentParserService } from './resume-document-parser.service';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

const DEFAULT_RESUME_MAX_BYTES = 5 * 1024 * 1024;

@Module({
  imports: [
    AuthModule,
    StorageModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const raw = configService.get<string>('RESUME_UPLOAD_MAX_BYTES');
        const parsed = Number(raw);
        const fileSize =
          Number.isFinite(parsed) && parsed > 0
            ? parsed
            : DEFAULT_RESUME_MAX_BYTES;
        return { limits: { fileSize } };
      },
    }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeDocumentParserService],
  exports: [ResumesService],
})
export class ResumesModule {}
