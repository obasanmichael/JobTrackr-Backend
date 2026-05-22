import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({
    description: 'Missing token or wrong current password.',
  })
  changePassword(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(currentUser, payload);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: SAFE_AUTH_THROTTLE_LIMIT,
      ttl: seconds(60),
    },
  })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiTooManyRequestsResponse({ description: 'Too many auth requests.' })
  forgotPassword(
    @Body() payload: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(payload);
  }

  @Post('reset-password')
  @Throttle({
    default: {
      limit: SAFE_AUTH_THROTTLE_LIMIT,
      ttl: seconds(60),
    },
  })
  @ApiOperation({ summary: 'Reset password using a one-time email token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired token.' })
  @ApiTooManyRequestsResponse({ description: 'Too many auth requests.' })
  resetPassword(@Body() payload: ResetPasswordDto): Promise<AuthResponseDto> {
    return this.authService.resetPassword(payload);
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
