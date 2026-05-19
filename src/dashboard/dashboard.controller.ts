import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiTags('dashboard')
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary metrics and activity slices',
  })
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  getSummary(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(currentUser);
  }
}
