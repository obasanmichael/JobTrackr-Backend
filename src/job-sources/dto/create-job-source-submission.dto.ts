import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateJobSourceSubmissionDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @ApiProperty({
    description: 'Public careers page URL (Greenhouse, Lever, Ashby, or other)',
    maxLength: 2048,
  })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  careersUrl!: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  submitterEmail?: string;
}
