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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateJobSourceAdminDto } from './dto/create-job-source-admin.dto';
import { JobSourceAdminResponseDto } from './dto/job-source-admin-response.dto';
import { JobSourceSyncResponseDto } from './dto/job-source-sync-response.dto';
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
  create(
    @Body() dto: CreateJobSourceAdminDto,
  ): Promise<JobSourceAdminResponseDto> {
    return this.jobSourcesService.createForAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a job source (partial; null config clears)',
  })
  @ApiOkResponse({ type: JobSourceAdminResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobSourceAdminDto,
  ): Promise<JobSourceAdminResponseDto> {
    return this.jobSourcesService.updateForAdmin(id, dto);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
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
  async sync(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobSourceSyncResponseDto> {
    const result =
      await this.jobIngestOrchestrationService.syncExternalJobs(id);

    return {
      jobSourceId: id,
      upsertedCount: result.upsertedCount,
      skippedInvalid: result.skippedInvalid,
      syncedAt: result.syncedAt,
    };
  }
}
