import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationEventResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  applicationId!: string;
  @ApiProperty()
  type!: string;
  @ApiProperty()
  title!: string;
  @ApiPropertyOptional()
  description?: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
