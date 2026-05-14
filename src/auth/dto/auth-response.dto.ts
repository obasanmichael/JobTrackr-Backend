import { UserProfileDto } from '../../users/dto/user-profile.dto';

export class AuthResponseDto {
  user!: UserProfileDto;
  accessToken!: string;
}
