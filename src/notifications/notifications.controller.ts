import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  NotificationUnreadCountResponseDto,
  NotificationsQueryDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('notifications')
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications for current user' })
  @ApiOkResponse({ type: NotificationListResponseDto })
  list(
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: NotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notifications.list(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count' })
  @ApiOkResponse({ type: NotificationUnreadCountResponseDto })
  async unreadCount(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<NotificationUnreadCountResponseDto> {
    const unreadCount = await this.notifications.unreadCount(user);
    return { unreadCount };
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(user, notificationId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({
    schema: {
      properties: { updatedCount: { type: 'number' } },
    },
  })
  markAllRead(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ updatedCount: number }> {
    return this.notifications.markAllRead(user);
  }
}
