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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JobSourceSubmissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
  ): Promise<ApproveJobSourceSubmissionResponseDto> {
    return this.jobSourceSubmissionsService.approve(id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending submission' })
  @ApiOkResponse({ type: JobSourceSubmissionResponseDto })
  @ApiNotFoundResponse({ description: 'Submission not found' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
  ): Promise<JobSourceSubmissionResponseDto> {
    return this.jobSourceSubmissionsService.reject(id, dto);
  }

  @Post(':id/spam')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a pending submission as spam' })
  @ApiOkResponse({ type: JobSourceSubmissionResponseDto })
  @ApiNotFoundResponse({ description: 'Submission not found' })
  markSpam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewJobSourceSubmissionDto,
  ): Promise<JobSourceSubmissionResponseDto> {
    return this.jobSourceSubmissionsService.markSpam(id, dto);
  }
}
