import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { clientRequestMeta } from './client-request-meta';
import { AdminSubscriptionListQueryDto } from './dto/admin-subscription-list-query.dto';
import {
  AdminSubscriptionRowDto,
  AdminSubscriptionsPageResponseDto,
} from './dto/admin-subscription-response.dto';
import { PatchAdminSubscriptionDto } from './dto/patch-admin-subscription.dto';

@ApiTags('admin-subscriptions')
@ApiBearerAuth('access-token')
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subscriptions (paginated; admin)' })
  @ApiOkResponse({ type: AdminSubscriptionsPageResponseDto })
  list(
    @Query() query: AdminSubscriptionListQueryDto,
  ): Promise<AdminSubscriptionsPageResponseDto> {
    return this.adminSubscriptionsService.list(query);
  }

  @Patch(':userId')
  @ApiOperation({
    summary:
      'Override subscription plan and/or status for a user (support; audited). `userId` is the subscriber.',
  })
  @ApiOkResponse({ type: AdminSubscriptionRowDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  patch(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: PatchAdminSubscriptionDto,
    @Req() req: Request,
  ): Promise<AdminSubscriptionRowDto> {
    return this.adminSubscriptionsService.patchSubscription(
      actor.userId,
      userId,
      dto,
      clientRequestMeta(req),
    );
  }
}
