import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
  MatchAlertPreferenceResponseDto,
  UpdateMatchAlertPreferenceDto,
} from './dto/match-alert-preference.dto';
import { MatchAlertPreferenceService } from './match-alert-preference.service';

@ApiTags('matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MatchAlertPreferencesController {
  constructor(
    private readonly matchAlertPreferenceService: MatchAlertPreferenceService,
  ) {}

  @Get('alert-preferences')
  @ApiOperation({
    summary: 'Get match alert preferences (thresholds and channels)',
  })
  @ApiOkResponse({ type: MatchAlertPreferenceResponseDto })
  getPreferences(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<MatchAlertPreferenceResponseDto> {
    return this.matchAlertPreferenceService.getOrDescribeDefaults(user);
  }

  @Patch('alert-preferences')
  @ApiOperation({ summary: 'Update match alert preferences' })
  @ApiOkResponse({ type: MatchAlertPreferenceResponseDto })
  patchPreferences(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: UpdateMatchAlertPreferenceDto,
  ): Promise<MatchAlertPreferenceResponseDto> {
    return this.matchAlertPreferenceService.upsert(user, body);
  }
}
