import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, User } from '@prisma/client';
import { isValidIanaTimezone } from '../common/utils/iana-timezone.util';
import { isValidThemePreference } from '../common/utils/theme-preference.util';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVATAR_OUTPUT_MIME,
  processAvatarImage,
} from '../storage/avatar-image.processor';
import { R2StorageService } from '../storage/r2.storage';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import {
  avatarStorageKeyForUser,
  toUserProfileDto,
} from './user-profile.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly r2Storage: R2StorageService,
  ) {}

  async getCurrentUserProfile(
    currentUser: CurrentUser,
  ): Promise<UserProfileDto> {
    const user = await this.requireUser(currentUser.userId);
    return toUserProfileDto(user, this.configService);
  }

  async updateCurrentUserProfile(
    currentUser: CurrentUser,
    dto: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    const hasName = dto.name !== undefined;
    const hasTimezone = dto.timezone !== undefined;
    const hasThemePreference = dto.themePreference !== undefined;
    if (!hasName && !hasTimezone && !hasThemePreference) {
      throw new BadRequestException('At least one field must be provided.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (hasName) {
      const name = dto.name!.trim();
      if (!name) {
        throw new BadRequestException('Name cannot be empty.');
      }
      data.name = name;
    }

    if (hasTimezone) {
      const timezone = dto.timezone?.trim() ?? '';
      if (!timezone) {
        data.timezone = null;
      } else if (!isValidIanaTimezone(timezone)) {
        throw new BadRequestException('Invalid timezone.');
      } else {
        data.timezone = timezone;
      }
    }

    if (hasThemePreference) {
      const themePreference = dto.themePreference?.trim() ?? '';
      if (!themePreference) {
        data.themePreference = null;
      } else if (!isValidThemePreference(themePreference)) {
        throw new BadRequestException('Invalid theme preference.');
      } else {
        data.themePreference = themePreference;
      }
    }

    const user = await this.prismaService.user.update({
      where: { id: currentUser.userId },
      data,
    });

    return toUserProfileDto(user, this.configService);
  }

  async uploadAvatar(
    currentUser: CurrentUser,
    file: Express.Multer.File | undefined,
  ): Promise<UserProfileDto> {
    UsersService.assertAvatarFilePresent(file);
    UsersService.assertAllowedAvatarMime(file.mimetype);

    let processed: Buffer;
    try {
      processed = await processAvatarImage(file.buffer, file.mimetype);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Could not process avatar image.');
    }

    const storageKey = avatarStorageKeyForUser(currentUser.userId);
    const avatarUpdatedAt = new Date();

    try {
      await this.r2Storage.putObject(storageKey, processed, AVATAR_OUTPUT_MIME);
    } catch {
      throw new InternalServerErrorException('Failed to upload avatar.');
    }

    const user = await this.prismaService.user.update({
      where: { id: currentUser.userId },
      data: {
        avatarStorageKey: storageKey,
        avatarUpdatedAt,
      },
    });

    return toUserProfileDto(user, this.configService);
  }

  async deleteAvatar(currentUser: CurrentUser): Promise<UserProfileDto> {
    const existing = await this.requireUser(currentUser.userId);
    if (existing.avatarStorageKey) {
      await this.r2Storage.deleteObject(existing.avatarStorageKey);
    }

    const user = await this.prismaService.user.update({
      where: { id: currentUser.userId },
      data: {
        avatarStorageKey: null,
        avatarUpdatedAt: null,
      },
    });

    return toUserProfileDto(user, this.configService);
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  private static assertAvatarFilePresent(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Avatar file is required.');
    }
  }

  private static assertAllowedAvatarMime(mimeType: string): void {
    const normalized = mimeType.trim().toLowerCase();
    if (
      normalized !== 'image/jpeg' &&
      normalized !== 'image/png' &&
      normalized !== 'image/webp'
    ) {
      throw new BadRequestException(
        'Avatar must be a JPEG, PNG, or WebP image.',
      );
    }
  }
}
