import { Injectable } from '@nestjs/common';
import type { MatchAlertPreference } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { NotificationPreferenceService } from '../notifications/notification-preference.service';
import { normalizeChannels } from '../notifications/notification-preference.types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MatchAlertPreferenceResponseDto,
  UpdateMatchAlertPreferenceDto,
} from './dto/match-alert-preference.dto';

function toResponseDto(
  row: MatchAlertPreference,
): MatchAlertPreferenceResponseDto {
  const channels = normalizeChannels(row.channels);
  return {
    enabled: row.enabled,
    minMatchScore: row.minMatchScore,
    channels,
    lastNotifiedAt: row.lastNotifiedAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class MatchAlertPreferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationPreferences: NotificationPreferenceService,
  ) {}

  async getOrDescribeDefaults(
    user: CurrentUser,
  ): Promise<MatchAlertPreferenceResponseDto> {
    const unified = await this.notificationPreferences.getOrDescribeDefaults(user);
    const matches = unified.categories.matches;

    const row = await this.prisma.matchAlertPreference.findUnique({
      where: { userId: user.userId },
    });

    return {
      enabled: matches.enabled,
      minMatchScore: matches.minMatchScore,
      channels: matches.channels,
      lastNotifiedAt: row?.lastNotifiedAt ?? null,
      updatedAt: unified.updatedAt,
    };
  }

  async upsert(
    user: CurrentUser,
    dto: UpdateMatchAlertPreferenceDto,
  ): Promise<MatchAlertPreferenceResponseDto> {
    const current = await this.notificationPreferences.getOrDescribeDefaults(user);

    const updated = await this.notificationPreferences.upsert(user, {
      categories: {
        matches: {
          enabled: dto.enabled ?? current.categories.matches.enabled,
          minMatchScore:
            dto.minMatchScore ?? current.categories.matches.minMatchScore,
          channels: dto.channels
            ? {
                email:
                  dto.channels.email ??
                  current.categories.matches.channels.email,
                push:
                  dto.channels.push ??
                  current.categories.matches.channels.push,
                inApp:
                  (dto.channels as { inApp?: boolean }).inApp ??
                  current.categories.matches.channels.inApp,
              }
            : current.categories.matches.channels,
        },
      },
    });

    const row = await this.prisma.matchAlertPreference.findUniqueOrThrow({
      where: { userId: user.userId },
    });

    return {
      enabled: updated.categories.matches.enabled,
      minMatchScore: updated.categories.matches.minMatchScore,
      channels: updated.categories.matches.channels,
      lastNotifiedAt: row.lastNotifiedAt,
      updatedAt: updated.updatedAt,
    };
  }
}
