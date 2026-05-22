import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogService } from '../admin/audit-log.service';
import {
  ADMIN_AUDIT_ACTION_JOB_QUALITY_PURGE,
  ADMIN_AUDIT_ACTION_JOB_QUALITY_SCAN,
  ADMIN_AUDIT_RESOURCE_JOB_QUALITY,
} from '../admin/admin.constants';
import { clientRequestMeta } from '../admin/client-request-meta';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
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
    private readonly auditLog: AuditLogService,
  ) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run quality scan on active external jobs (apply URL, salary, duplicate hash)',
  })
  @ApiOkResponse({ type: ExternalJobQualityScanResponseDto })
  async scan(
    @CurrentUserDecorator() actor: CurrentUser,
    @Req() req: Request,
  ): Promise<ExternalJobQualityScanResponseDto> {
    const result = await this.externalJobQualityService.runQualityScan();
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_QUALITY_SCAN,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_QUALITY,
      resourceId: 'scan',
      metadata: {
        scannedCount: result.scannedCount,
        suspiciousCount: result.suspiciousCount,
        clearedCount: result.clearedCount,
        durationMs: result.durationMs,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
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
  async purgeInactive(
    @CurrentUserDecorator() actor: CurrentUser,
    @Query('dryRun') dryRun: string | undefined,
    @Req() req: Request,
  ): Promise<ExternalJobInactivePurgeResponseDto> {
    const isDryRun = dryRun === 'true' || dryRun === '1';
    this.externalJobQualityService.assertPurgeEnabledOrDryRun(isDryRun);
    const result =
      await this.externalJobQualityService.purgeInactiveExternalJobs({
        dryRun: isDryRun,
      });
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_QUALITY_PURGE,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_QUALITY,
      resourceId: 'purge-inactive',
      metadata: {
        dryRun: result.dryRun,
        matchedCount: result.matchedCount,
        deletedCount: result.deletedCount,
        durationMs: result.durationMs,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }
}
