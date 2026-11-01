import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTokenResponseDto } from './dto/api-token-response.dto';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { CreatedApiTokenResponseDto } from './dto/created-api-token-response.dto';

export const API_TOKEN_PREFIX = 'jt_';
const DISPLAY_PREFIX_LENGTH = 10;
/** Skip the lastUsedAt write when it was refreshed recently (remote DB round-trip). */
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

@Injectable()
export class ApiTokensService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    currentUser: CurrentUser,
    payload: CreateApiTokenDto,
  ): Promise<CreatedApiTokenResponseDto> {
    const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const expiresAt = payload.expiresInDays
      ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await this.prismaService.apiToken.create({
      data: {
        userId: currentUser.userId,
        name: payload.name,
        prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
        tokenHash: this.hash(token),
        expiresAt,
      },
    });

    return { ...this.toResponse(created), token };
  }

  async list(currentUser: CurrentUser): Promise<ApiTokenResponseDto[]> {
    const tokens = await this.prismaService.apiToken.findMany({
      where: { userId: currentUser.userId, revokedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return tokens.map((token) => this.toResponse(token));
  }

  async revoke(currentUser: CurrentUser, id: string): Promise<void> {
    const result = await this.prismaService.apiToken.updateMany({
      where: { id, userId: currentUser.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('API token not found.');
    }
  }

  /** Resolves a plaintext token to its owner, or null if unknown/revoked/expired. */
  async authenticate(token: string): Promise<CurrentUser | null> {
    if (!token.startsWith(API_TOKEN_PREFIX)) {
      return null;
    }

    const record = await this.prismaService.apiToken.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!record || record.revokedAt) {
      return null;
    }

    const now = Date.now();
    if (record.expiresAt && record.expiresAt.getTime() <= now) {
      return null;
    }

    if (
      !record.lastUsedAt ||
      now - record.lastUsedAt.getTime() > LAST_USED_REFRESH_MS
    ) {
      void this.prismaService.apiToken
        .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    return { userId: record.user.id, email: record.user.email };
  }

  private hash(token: string): string {
    // Tokens are 256 bits of randomness, so a fast hash is sufficient.
    return createHash('sha256').update(token).digest('hex');
  }

  private toResponse(token: {
    id: string;
    name: string;
    prefix: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): ApiTokenResponseDto {
    return {
      id: token.id,
      name: token.name,
      prefix: token.prefix,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    };
  }
}
