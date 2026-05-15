import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReminderResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  applicationId!: string;
  @ApiProperty()
  title!: string;
  @ApiPropertyOptional()
  description?: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  dueDate!: Date;
  @ApiProperty()
  isCompleted!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
