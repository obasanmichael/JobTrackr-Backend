import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
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
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiConflictResponse({ description: 'Email already exists.' })
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiTooManyRequestsResponse({ description: 'Too many auth requests.' })
  login(@Body() payload: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  me(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<UserProfileDto> {
    return this.authService.getMe(currentUser);
  }
}
