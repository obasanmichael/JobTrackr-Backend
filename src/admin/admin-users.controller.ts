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
import { AdminUsersService } from './admin-users.service';
import { clientRequestMeta } from './client-request-meta';
import { AdminUserListQueryDto } from './dto/admin-user-list-query.dto';
import {
  AdminUserDetailDto,
  AdminUserSummaryDto,
  AdminUsersPageResponseDto,
} from './dto/admin-user-response.dto';
import { PatchAdminUserDto } from './dto/patch-admin-user.dto';

@ApiTags('admin-users')
@ApiBearerAuth('access-token')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated; admin)' })
  @ApiOkResponse({ type: AdminUsersPageResponseDto })
  listUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<AdminUsersPageResponseDto> {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'User detail plus subscription snapshot (admin)' })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserDetailDto> {
    return this.adminUsersService.getUserById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user display name (audited)' })
  @ApiOkResponse({ type: AdminUserSummaryDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  patchUser(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchAdminUserDto,
    @Req() req: Request,
  ): Promise<AdminUserSummaryDto> {
    return this.adminUsersService.patchUserDisplayName(
      actor.userId,
      id,
      dto.name,
      clientRequestMeta(req),
    );
  }
}
