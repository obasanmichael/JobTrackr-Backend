import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(currentUser);
  }
}
