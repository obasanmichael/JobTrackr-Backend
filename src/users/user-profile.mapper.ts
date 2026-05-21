import type { User } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import { buildR2PublicObjectUrl } from '../storage/r2.config';
import { UserProfileDto } from './dto/user-profile.dto';

export function toUserProfileDto(
  user: User,
  configService: ConfigService,
): UserProfileDto {
  const profile: UserProfileDto = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    avatarUrl: null,
  };

  if (!user.avatarStorageKey) {
    return profile;
  }

  try {
    profile.avatarUrl = buildR2PublicObjectUrl(
      configService,
      user.avatarStorageKey,
      user.avatarUpdatedAt,
    );
  } catch {
    profile.avatarUrl = null;
  }

  return profile;
}

export function avatarStorageKeyForUser(userId: string): string {
  return `avatars/${userId}/avatar.webp`;
}
