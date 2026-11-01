import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiTokenResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ example: 'jt_AbCd12' })
  prefix!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastUsedAt!: Date | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expiresAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
