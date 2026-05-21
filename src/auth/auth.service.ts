import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import type { SignOptions } from 'jsonwebtoken';
import { SubscriptionProvisioningService } from '../billing/subscription-provisioning.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { CurrentUser } from '../common/types/current-user.type';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { toUserProfileDto } from '../users/user-profile.mapper';
import { getAuthConfig, type AuthConfig } from './auth.config';
import type { JwtPayload } from './types/jwt-payload.type';

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

@Injectable()
export class AuthService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly subscriptionProvisioning: SubscriptionProvisioningService,
  ) {
    this.authConfig = getAuthConfig(configService);
  }

  async register(payload: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: payload.email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(payload.password);
    const createdUser = await this.prismaService.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
      },
    });

    await this.subscriptionProvisioning.ensureBetaSubscription(createdUser.id);

    return this.buildAuthResponse(createdUser);
  }

  async login(payload: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await this.verifyPassword(
      user.passwordHash,
      payload.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.buildAuthResponse(user);
  }

  async getMe(currentUser: CurrentUser): Promise<UserProfileDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toUserProfile(user);
  }

  protected hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  protected verifyPassword(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const signOptions: SignOptions = {
      expiresIn: this.authConfig.accessExpiresIn,
    };
    if (this.authConfig.issuer) {
      signOptions.issuer = this.authConfig.issuer;
    }
    if (this.authConfig.audience) {
      signOptions.audience = this.authConfig.audience;
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      ...signOptions,
    });

    return {
      user: this.toUserProfile(user),
      accessToken,
    };
  }

  private toUserProfile(user: User): UserProfileDto {
    return toUserProfileDto(user, this.configService);
  }
}
