import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { CurrentUser } from '../common/types/current-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() payload: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserDecorator() currentUser: CurrentUser): Promise<UserProfileDto> {
    return this.authService.getMe(currentUser);
  }
}
