import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSourceSubmissionStatus } from '@prisma/client';

export class JobSourceSubmissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty()
  careersUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  submitterEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  submitterUserId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Detected ATS provider when URL matches a known host.',
  })
  detectedAtsType!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Board token / site slug / org slug parsed from the URL.',
  })
  detectedSlug!: string | null;

  @ApiProperty({
    enum: JobSourceSubmissionStatus,
    enumName: 'JobSourceSubmissionStatus',
  })
  status!: JobSourceSubmissionStatus;

  @ApiPropertyOptional({ nullable: true })
  jobSourceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewerNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
