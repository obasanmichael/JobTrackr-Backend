import { ApiProperty } from '@nestjs/swagger';

export class RunDueNotificationsResponseDto {
  @ApiProperty({
    description: 'False when NOTIFICATION_WORKER_ENABLED is unset/disabled.',
  })
  enabled!: boolean;

  @ApiProperty()
  remindersSent!: number;

  @ApiProperty()
  interviewsSent!: number;
}
