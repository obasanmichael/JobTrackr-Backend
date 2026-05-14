import { Injectable, NotImplementedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from '../common/types/current-user.type';
import { UserProfileDto } from '../users/dto/user-profile.dto';

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

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

  protected hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  protected verifyPassword(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }
}
