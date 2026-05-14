import { Injectable, NotImplementedException } from '@nestjs/common';
import { CurrentUser } from '../common/types/current-user.type';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  getCurrentUserProfile(_currentUser: CurrentUser): Promise<UserProfileDto> {
    throw new NotImplementedException('Stage 2 users/me flow not implemented yet.');
  }
}
