import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeParseStatus } from '@prisma/client';

export class ResumeResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  fileName!: string;
  @ApiProperty()
  fileType!: string;
  @ApiProperty()
  fileSize!: number;
  @ApiPropertyOptional()
  fileUrl!: string | null;
  @ApiProperty()
  storageKey!: string;
  @ApiProperty({ enum: ResumeParseStatus })
  status!: ResumeParseStatus;
  @ApiPropertyOptional()
  parsedText!: string | null;
  @ApiPropertyOptional()
  parseError!: string | null;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
