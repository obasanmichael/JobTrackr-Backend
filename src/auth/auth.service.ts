import {
  BadRequestException,
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
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_RESET_TOKEN_MESSAGE,
  PASSWORD_UPDATED_MESSAGE,
} from './auth.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { CurrentUser } from '../common/types/current-user.type';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { toUserProfileDto } from '../users/user-profile.mapper';
import { getAuthConfig, type AuthConfig } from './auth.config';
import {
  generatePasswordResetToken,
  hashResetToken,
} from './password-reset-token.util';
import type { JwtPayload } from './types/jwt-payload.type';

export { INVALID_CREDENTIALS_MESSAGE };

@Injectable()
export class AuthService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly subscriptionProvisioning: SubscriptionProvisioningService,
    private readonly emailService: EmailService,
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

  async changePassword(
    currentUser: CurrentUser,
    payload: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isCurrentValid = await this.verifyPassword(
      user.passwordHash,
      payload.currentPassword,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const passwordHash = await this.hashPassword(payload.newPassword);
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prismaService.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return { message: PASSWORD_UPDATED_MESSAGE };
  }

  async forgotPassword(payload: ForgotPasswordDto): Promise<MessageResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      const { rawToken, tokenHash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + this.passwordResetTtlMs());

      await this.prismaService.$transaction([
        this.prismaService.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        this.prismaService.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        }),
      ]);

      const resetUrl = this.buildPasswordResetUrl(rawToken);
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      });
    }

    return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
  }

  async resetPassword(payload: ResetPasswordDto): Promise<AuthResponseDto> {
    const tokenHash = hashResetToken(payload.token);
    const resetToken = await this.prismaService.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await this.hashPassword(payload.newPassword);
    const userId = resetToken.userId;

    const updatedUser = await this.prismaService.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId, usedAt: null },
      });
      return tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    });

    return this.buildAuthResponse(updatedUser);
  }

  protected hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  protected verifyPassword(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }

  private passwordResetTtlMs(): number {
    const hours = Number(
      this.configService.get<string>('PASSWORD_RESET_TTL_HOURS') ?? '1',
    );
    const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
    return safeHours * 60 * 60 * 1000;
  }

  private buildPasswordResetUrl(rawToken: string): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ??
      'http://localhost:3000';
    const base = frontendUrl.replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
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
