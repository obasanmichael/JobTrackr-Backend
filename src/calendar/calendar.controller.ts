import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { CalendarSyncService } from './calendar-sync.service';
import {
  CalendarConnectResponseDto,
  CalendarStatusResponseDto,
  PatchCalendarSettingsDto,
  SyncInterviewsDto,
  SyncInterviewsResponseDto,
} from './dto/calendar.dto';

@Controller('calendar')
@ApiTags('calendar')
export class CalendarController {
  constructor(
    private readonly integrations: CalendarIntegrationsService,
    private readonly syncService: CalendarSyncService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Calendar connection status (no tokens exposed)' })
  @ApiOkResponse({ type: CalendarStatusResponseDto })
  status(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CalendarStatusResponseDto> {
    return this.integrations.getStatus(user);
  }

  @Get('google/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start Google Calendar OAuth flow' })
  @ApiOkResponse({ type: CalendarConnectResponseDto })
  connect(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CalendarConnectResponseDto> {
    return this.integrations.getConnectUrl(user);
  }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback — redirects to web calendar settings',
  })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.integrations.handleGoogleCallback(
      code,
      state,
      error,
    );
    res.redirect(redirectUrl);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disconnect Google Calendar integration' })
  @ApiOkResponse({ type: CalendarStatusResponseDto })
  disconnect(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CalendarStatusResponseDto> {
    return this.integrations.disconnect(user);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update calendar sync settings' })
  @ApiOkResponse({ type: CalendarStatusResponseDto })
  updateSettings(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: PatchCalendarSettingsDto,
  ): Promise<CalendarStatusResponseDto> {
    return this.integrations.updateSettings(user, dto);
  }

  @Post('sync/interviews')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Sync upcoming interviews (or one interview) to Google Calendar',
  })
  @ApiOkResponse({ type: SyncInterviewsResponseDto })
  syncInterviews(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: SyncInterviewsDto,
  ): Promise<SyncInterviewsResponseDto> {
    return this.syncService.syncInterviews(user, dto);
  }
}
