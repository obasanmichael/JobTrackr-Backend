import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JobSourceSubmissionStatus } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogService } from '../admin/audit-log.service';
import {
  ADMIN_AUDIT_ACTION_SUBMISSION_APPROVE,
  ADMIN_AUDIT_ACTION_SUBMISSION_REJECT,
  ADMIN_AUDIT_ACTION_SUBMISSION_SPAM,
  ADMIN_AUDIT_RESOURCE_JOB_SOURCE_SUBMISSION,
} from '../admin/admin.constants';
import { clientRequestMeta } from '../admin/client-request-meta';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApproveJobSourceSubmissionResponseDto } from './dto/approve-job-source-submission-response.dto';
import { JobSourceSubmissionResponseDto } from './dto/job-source-submission-response.dto';
import { ListJobSourceSubmissionsQueryDto } from './dto/list-job-source-submissions-query.dto';
import { ReviewJobSourceSubmissionDto } from './dto/review-job-source-submission.dto';
import { JobSourceSubmissionsService } from './job-source-submissions.service';

@ApiTags('admin-job-source-submissions')
@Controller('admin/job-source-submissions')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminJobSourceSubmissionsController {
  constructor(
    private readonly jobSourceSubmissionsService: JobSourceSubmissionsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List careers page submissions for admin review' })
  @ApiOkResponse({ type: [JobSourceSubmissionResponseDto] })
  list(
    @Query() query: ListJobSourceSubmissionsQueryDto,
  ): Promise<JobSourceSubmissionResponseDto[]> {
    return this.jobSourceSubmissionsService.listForAdmin(
      query.status ?? JobSourceSubmissionStatus.PENDING,
    );
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Approve a submission — creates or updates JobSource and runs first sync when ingest is supported',
  })
  @ApiOkResponse({ type: ApproveJobSourceSubmissionResponseDto })
  @ApiNotFoundResponse({ description: 'Submission not found' })
  async approve(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
    @Req() req: Request,
  ): Promise<ApproveJobSourceSubmissionResponseDto> {
    const result = await this.jobSourceSubmissionsService.approve(id, dto);
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_SUBMISSION_APPROVE,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE_SUBMISSION,
      resourceId: id,
      metadata: { jobSourceId: result.jobSource.id },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending submission' })
  @ApiOkResponse({ type: JobSourceSubmissionResponseDto })
  @ApiNotFoundResponse({ description: 'Submission not found' })
  async reject(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
    @Req() req: Request,
  ): Promise<JobSourceSubmissionResponseDto> {
    const result = await this.jobSourceSubmissionsService.reject(id, dto);
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_SUBMISSION_REJECT,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE_SUBMISSION,
      resourceId: id,
      metadata: {},
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }

  @Post(':id/spam')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a pending submission as spam' })
  @ApiOkResponse({ type: JobSourceSubmissionResponseDto })
  @ApiNotFoundResponse({ description: 'Submission not found' })
  async markSpam(
    @CurrentUserDecorator() actor: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
    @Req() req: Request,
  ): Promise<JobSourceSubmissionResponseDto> {
    const result = await this.jobSourceSubmissionsService.markSpam(id, dto);
    const meta = clientRequestMeta(req);
    await this.auditLog.record({
      actorUserId: actor.userId,
      action: ADMIN_AUDIT_ACTION_SUBMISSION_SPAM,
      resourceType: ADMIN_AUDIT_RESOURCE_JOB_SOURCE_SUBMISSION,
      resourceId: id,
      metadata: {},
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return result;
  }
}
