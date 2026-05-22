import { Injectable } from '@nestjs/common';
import type { NotificationPreference } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateNotificationPreferenceDto } from './dto/notification-preference.dto';
import {
  DEFAULT_NOTIFICATION_CATEGORIES,
  mergeCategories,
  normalizeCategories,
  type NotificationCategories,
} from './notification-preference.types';

export type NotificationPreferenceResponse = {
  categories: NotificationCategories;
  updatedAt?: Date;
};

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrDescribeDefaults(
    user: CurrentUser,
  ): Promise<NotificationPreferenceResponse> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.userId },
    });

    if (row) {
      return this.toResponse(row);
    }

    const legacyMatch = await this.prisma.matchAlertPreference.findUnique({
      where: { userId: user.userId },
    });

    if (!legacyMatch) {
      return { categories: structuredClone(DEFAULT_NOTIFICATION_CATEGORIES) };
    }

    return {
      categories: normalizeCategories({
        ...DEFAULT_NOTIFICATION_CATEGORIES,
        matches: {
          enabled: legacyMatch.enabled,
          minMatchScore: legacyMatch.minMatchScore,
          channels: legacyMatch.channels,
        },
      }),
    };
  }

  async upsert(
    user: CurrentUser,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponse> {
    const current = (await this.getOrDescribeDefaults(user)).categories;
    const next = dto.categories
      ? mergeCategories(current, dto.categories)
      : current;

    const row = await this.prisma.notificationPreference.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        categories: next,
      },
      update: {
        categories: next,
      },
    });

    await this.syncLegacyMatchPreference(user.userId, next.matches);

    return this.toResponse(row);
  }

  async getCategoriesForUser(userId: string): Promise<NotificationCategories> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (row) {
      return normalizeCategories(row.categories);
    }

    const legacyMatch = await this.prisma.matchAlertPreference.findUnique({
      where: { userId },
    });
    if (!legacyMatch) {
      return structuredClone(DEFAULT_NOTIFICATION_CATEGORIES);
    }

    return normalizeCategories({
      ...DEFAULT_NOTIFICATION_CATEGORIES,
      matches: {
        enabled: legacyMatch.enabled,
        minMatchScore: legacyMatch.minMatchScore,
        channels: legacyMatch.channels,
      },
    });
  }

  private async syncLegacyMatchPreference(
    userId: string,
    matches: NotificationCategories['matches'],
  ): Promise<void> {
    await this.prisma.matchAlertPreference.upsert({
      where: { userId },
      create: {
        userId,
        enabled: matches.enabled,
        minMatchScore: matches.minMatchScore,
        channels: matches.channels,
      },
      update: {
        enabled: matches.enabled,
        minMatchScore: matches.minMatchScore,
        channels: matches.channels,
      },
    });
  }

  private toResponse(row: NotificationPreference): NotificationPreferenceResponse {
    return {
      categories: normalizeCategories(row.categories),
      updatedAt: row.updatedAt,
    };
  }
}
