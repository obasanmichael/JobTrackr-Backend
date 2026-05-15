import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { CurrentUser } from '../common/types/current-user.type';

const AUTH_THROTTLE_LIMIT = Number(process.env.AUTH_THROTTLE_LIMIT ?? '30');
const SAFE_AUTH_THROTTLE_LIMIT =
  Number.isFinite(AUTH_THROTTLE_LIMIT) && AUTH_THROTTLE_LIMIT > 0
    ? AUTH_THROTTLE_LIMIT
    : 30;

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({
    default: {
      limit: SAFE_AUTH_THROTTLE_LIMIT,
      ttl: seconds(60),
    },
  })
  @ApiTooManyRequestsResponse({ description: 'Too many auth requests.' })
  register(@Body() payload: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(payload);
  }

  @Post('login')
  @Throttle({
    default: {
      limit: SAFE_AUTH_THROTTLE_LIMIT,
      ttl: seconds(60),
    },
  })
  @ApiTooManyRequestsResponse({ description: 'Too many auth requests.' })
  login(@Body() payload: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  me(@CurrentUserDecorator() currentUser: CurrentUser): Promise<UserProfileDto> {
    return this.authService.getMe(currentUser);
  }
}
