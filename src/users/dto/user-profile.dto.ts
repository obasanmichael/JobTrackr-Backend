import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Public CDN URL for the user avatar, if set.',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'IANA timezone for reminders and scheduled notifications.',
  })
  timezone!: string | null;

  @ApiProperty({
    enum: ['system', 'light', 'dark'],
    description: 'UI theme preference; system follows device settings.',
  })
  themePreference!: string;
}
