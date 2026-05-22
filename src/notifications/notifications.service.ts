import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  type Notification,
  type Prisma,
} from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  NotificationsQueryDto,
} from './dto/notification.dto';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateNotificationInput,
  ): Promise<NotificationResponseDto> {
    const created = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      },
    });
    return this.toResponse(created);
  }

  async list(
    user: CurrentUser,
    query: NotificationsQueryDto = {},
  ): Promise<NotificationListResponseDto> {
    const limit = query.limit ?? 20;
    const where = {
      userId: user.userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId: user.userId, readAt: null },
      }),
    ]);

    return {
      items: items.map((row) => this.toResponse(row)),
      unreadCount,
    };
  }

  async unreadCount(user: CurrentUser): Promise<number> {
    return this.prisma.notification.count({
      where: { userId: user.userId, readAt: null },
    });
  }

  async markRead(
    user: CurrentUser,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId: user.userId },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = existing.readAt
      ? existing
      : await this.prisma.notification.update({
          where: { id: notificationId },
          data: { readAt: new Date() },
        });

    return this.toResponse(updated);
  }

  async markAllRead(user: CurrentUser): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  private toResponse(row: Notification): NotificationResponseDto {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }
}
