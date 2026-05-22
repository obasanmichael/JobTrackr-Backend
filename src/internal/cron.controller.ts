import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { DueNotificationsWorkerService } from '../notifications/due-notifications.worker.service';
import { RunDueNotificationsResponseDto } from './dto/run-due-notifications-response.dto';

@ApiTags('internal-cron')
@Controller('internal/cron')
@SkipThrottle()
export class CronController {
  constructor(
    private readonly dueNotificationsWorker: DueNotificationsWorkerService,
  ) {}

  @Post('notifications/run-due-checks')
  @SkipThrottle({ default: true })
  @HttpCode(HttpStatus.OK)
  @UseGuards(CronSecretGuard)
  @ApiOperation({
    summary:
      'Run reminder/interview due notification checks (Render cron / ops only)',
  })
  @ApiOkResponse({ type: RunDueNotificationsResponseDto })
  runDueNotifications(): Promise<RunDueNotificationsResponseDto> {
    return this.dueNotificationsWorker.runDueChecks();
  }
}
