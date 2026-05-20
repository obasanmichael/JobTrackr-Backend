import { Injectable } from '@nestjs/common';
import type { MatchAlertPreference } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MatchAlertPreferenceResponseDto,
  UpdateMatchAlertPreferenceDto,
} from './dto/match-alert-preference.dto';

function channelsFromJson(value: unknown): Record<string, boolean> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function toResponseDto(row: MatchAlertPreference): MatchAlertPreferenceResponseDto {
  return {
    enabled: row.enabled,
    minMatchScore: row.minMatchScore,
    channels: channelsFromJson(row.channels),
    lastNotifiedAt: row.lastNotifiedAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class MatchAlertPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrDescribeDefaults(
    user: CurrentUser,
  ): Promise<MatchAlertPreferenceResponseDto> {
    const row = await this.prisma.matchAlertPreference.findUnique({
      where: { userId: user.userId },
    });
    if (!row) {
      return {
        enabled: false,
        minMatchScore: 70,
        channels: null,
        lastNotifiedAt: null,
      };
    }
    return toResponseDto(row);
  }

  async upsert(
    user: CurrentUser,
    dto: UpdateMatchAlertPreferenceDto,
  ): Promise<MatchAlertPreferenceResponseDto> {
    const row = await this.prisma.matchAlertPreference.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        enabled: dto.enabled ?? false,
        minMatchScore: dto.minMatchScore ?? 70,
        channels: dto.channels === undefined ? undefined : dto.channels,
      },
      update: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.minMatchScore !== undefined
          ? { minMatchScore: dto.minMatchScore }
          : {}),
        ...(dto.channels !== undefined ? { channels: dto.channels } : {}),
      },
    });
    return toResponseDto(row);
  }
}
