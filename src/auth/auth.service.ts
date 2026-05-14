import { Injectable, NotImplementedException } from '@nestjs/common';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from '../common/types/current-user.type';
import { UserProfileDto } from '../users/dto/user-profile.dto';

@Injectable()
export class AuthService {
  register(_payload: RegisterDto): Promise<AuthResponseDto> {
    throw new NotImplementedException('Stage 2 register flow not implemented yet.');
  }

  login(_payload: LoginDto): Promise<AuthResponseDto> {
    throw new NotImplementedException('Stage 2 login flow not implemented yet.');
  }

  getMe(_currentUser: CurrentUser): Promise<UserProfileDto> {
    throw new NotImplementedException('Stage 2 auth/me flow not implemented yet.');
  }
}
