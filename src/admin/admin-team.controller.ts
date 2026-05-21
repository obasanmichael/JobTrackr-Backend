import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminRole } from '@prisma/client';
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
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminTeamService } from './admin-team.service';
import { clientRequestMeta } from './client-request-meta';
import {
  AdminTeamMemberDto,
  CreateTeamMemberDto,
  PatchTeamMemberDto,
} from './dto/admin-team.dto';

@ApiTags('admin-team')
@ApiBearerAuth('access-token')
@Controller('admin/team')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminTeamController {
  constructor(private readonly adminTeamService: AdminTeamService) {}

  @Get()
  @ApiOperation({ summary: 'List admin memberships (internal team)' })
  @ApiOkResponse({ type: [AdminTeamMemberDto] })
  listMembers(): Promise<AdminTeamMemberDto[]> {
    return this.adminTeamService.listMembers();
  }

  @Post()
  @UseGuards(AdminRolesGuard)
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  @ApiOperation({
    summary: 'Invite or reactivate an admin (OWNER may grant OWNER)',
  })
  @ApiOkResponse({ type: AdminTeamMemberDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  createMembership(
    @CurrentUserDecorator() actor: CurrentUser,
    @Body() dto: CreateTeamMemberDto,
    @Req() req: Request,
  ): Promise<AdminTeamMemberDto> {
    return this.adminTeamService.createMembership(
      actor.userId,
      dto,
      clientRequestMeta(req),
    );
  }

  @Patch(':id')
  @UseGuards(AdminRolesGuard)
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Change role or status of an admin membership' })
  @ApiOkResponse({ type: AdminTeamMemberDto })
  @ApiNotFoundResponse({ description: 'Membership not found' })
  patchMembership(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchTeamMemberDto,
    @Req() req: Request,
  ): Promise<AdminTeamMemberDto> {
    return this.adminTeamService.patchMembership(
      actor.userId,
      id,
      dto,
      clientRequestMeta(req),
    );
  }
}
