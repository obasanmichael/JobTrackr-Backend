import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSourceAdminResponseDto } from './job-source-admin-response.dto';
import { JobSourceSubmissionResponseDto } from './job-source-submission-response.dto';
import { JobSourceSyncResponseDto } from './job-source-sync-response.dto';

export class ApproveJobSourceSubmissionResponseDto {
  @ApiProperty({ type: JobSourceSubmissionResponseDto })
  submission!: JobSourceSubmissionResponseDto;

  @ApiProperty({ type: JobSourceAdminResponseDto })
  jobSource!: JobSourceAdminResponseDto;

  @ApiPropertyOptional({
    type: JobSourceSyncResponseDto,
    nullable: true,
    description:
      'Present when a first ingest sync was attempted after approval; omitted when sync is skipped.',
  })
  sync!: JobSourceSyncResponseDto | null;
}
