import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuditLogService } from '../admin/audit-log.service';
import {
  ADMIN_AUDIT_ACTION_JOB_SOURCE_CREATE,
  ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC,
  ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC_ACTIVE,
  ADMIN_AUDIT_ACTION_JOB_SOURCE_UPDATE,
  ADMIN_AUDIT_RESOURCE_JOB_SOURCE,
} from '../admin/admin.constants';
import { clientRequestMeta } from '../admin/client-request-meta';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { AdminGuard } from '../common/guards/admin.guard';
import { ADMIN_SYNC_THROTTLE } from './admin-sync-throttle';
import { CreateJobSourceAdminDto } from './dto/create-job-source-admin.dto';
import { JobSourceAdminResponseDto } from './dto/job-source-admin-response.dto';
import { JobSourceSyncResponseDto } from './dto/job-source-sync-response.dto';
import { JobSourceBulkSyncResponseDto } from './dto/job-source-bulk-sync-response.dto';
import { UpdateJobSourceAdminDto } from './dto/update-job-source-admin.dto';
import { JobIngestOrchestrationService } from './job-ingest-orchestration.service';
import { JobSourcesService } from './job-sources.service';

@ApiTags('admin-job-sources')
@Controller('admin/job-sources')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminJobSourcesController {
  constructor(
    private readonly jobSourcesService: JobSourcesService,
    private readonly jobIngestOrchestrationService: JobIngestOrchestrationService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List external job ingestion sources (admin)' })
  @ApiOkResponse({ type: [JobSourceAdminResponseDto] })
  list(): Promise<JobSourceAdminResponseDto[]> {
    return this.jobSourcesService.listForAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Create a job source (ATS board / provider row)' })
  @ApiCreatedResponse({ type: JobSourceAdminResponseDto })
  async create(
    @CurrentUserDecorator() actor: CurrentUser,
    @Body() dto: CreateJobSourceAdminDto,
    @Req() req: Request,
  ): Promise<JobSourceAdminResponseDto> {
    const result = await this.jobSourcesService.createForAdmin(dto);
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_SOURCE_CREATE,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE,
      resourceId: result.id,
      metadata: { name: result.name, type: result.type },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a job source (partial; null config clears)',
  })
  @ApiOkResponse({ type: JobSourceAdminResponseDto })
  async update(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobSourceAdminDto,
    @Req() req: Request,
  ): Promise<JobSourceAdminResponseDto> {
    const result = await this.jobSourcesService.updateForAdmin(id, dto);
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_SOURCE_UPDATE,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE,
      resourceId: id,
      metadata: { patchKeys: Object.keys(dto) },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }

  @Post('sync-active')
  @HttpCode(HttpStatus.OK)
  @Throttle(ADMIN_SYNC_THROTTLE)
  @ApiOperation({
    summary:
      'Run ingest sync for all active job sources (sequential; continues after individual failures)',
  })
  @ApiOkResponse({ type: JobSourceBulkSyncResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Admin sync rate limit exceeded' })
  async syncActive(
    @CurrentUserDecorator() actor: CurrentUser,
    @Req() req: Request,
  ): Promise<JobSourceBulkSyncResponseDto> {
    const result =
      await this.jobIngestOrchestrationService.syncAllActiveJobSources();
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC_ACTIVE,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE,
      resourceId: 'sync-active',
      metadata: {
        attempted: result.attempted,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @Throttle(ADMIN_SYNC_THROTTLE)
  @ApiOperation({
    summary:
      'Run ingest sync for one job source (synchronous; fetches ATS snapshot and upserts external jobs)',
  })
  @ApiOkResponse({ type: JobSourceSyncResponseDto })
  @ApiNotFoundResponse({ description: 'Job source not found' })
  @ApiBadGatewayResponse({
    description:
      'ATS fetch or persist failed; source lastError* fields are updated',
  })
  @ApiTooManyRequestsResponse({ description: 'Admin sync rate limit exceeded' })
  async sync(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<JobSourceSyncResponseDto> {
    const syncResult =
      await this.jobIngestOrchestrationService.syncExternalJobs(id);

    const body = {
      jobSourceId: id,
      upsertedCount: syncResult.upsertedCount,
      skippedInvalid: syncResult.skippedInvalid,
      inactivatedCount: syncResult.inactivatedCount,
      durationMs: syncResult.durationMs,
      syncedAt: syncResult.syncedAt,
    };

    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE,
      resourceId: id,
      metadata: {
        upsertedCount: syncResult.upsertedCount,
        skippedInvalid: syncResult.skippedInvalid,
        inactivatedCount: syncResult.inactivatedCount,
        durationMs: syncResult.durationMs,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return body;
  }
}
