import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ExternalJobInactivePurgeResponseDto } from './dto/external-job-inactive-purge-response.dto';
import { ExternalJobQualityScanResponseDto } from './dto/external-job-quality-scan-response.dto';
import { ExternalJobQualityService } from './external-job-quality.service';

@ApiTags('admin-job-quality')
@Controller('admin/job-quality')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminJobQualityController {
  constructor(
    private readonly externalJobQualityService: ExternalJobQualityService,
  ) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run quality scan on active external jobs (apply URL, salary, duplicate hash)',
  })
  @ApiOkResponse({ type: ExternalJobQualityScanResponseDto })
  scan(): Promise<ExternalJobQualityScanResponseDto> {
    return this.externalJobQualityService.runQualityScan();
  }

  @Post('purge-inactive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Purge inactive external jobs older than retention window (requires EXTERNAL_JOB_PURGE_ENABLED)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'When true, only counts rows that would be deleted.',
  })
  @ApiOkResponse({ type: ExternalJobInactivePurgeResponseDto })
  purgeInactive(
    @Query('dryRun') dryRun?: string,
  ): Promise<ExternalJobInactivePurgeResponseDto> {
    const isDryRun = dryRun === 'true' || dryRun === '1';
    this.externalJobQualityService.assertPurgeEnabledOrDryRun(isDryRun);
    return this.externalJobQualityService.purgeInactiveExternalJobs({
      dryRun: isDryRun,
    });
  }
}
