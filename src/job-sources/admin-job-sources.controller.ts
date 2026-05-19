import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateJobSourceAdminDto } from './dto/create-job-source-admin.dto';
import { JobSourceAdminResponseDto } from './dto/job-source-admin-response.dto';
import { UpdateJobSourceAdminDto } from './dto/update-job-source-admin.dto';
import { JobSourcesService } from './job-sources.service';

@ApiTags('admin-job-sources')
@Controller('admin/job-sources')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminJobSourcesController {
  constructor(private readonly jobSourcesService: JobSourcesService) {}

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
  @ApiOperation({ summary: 'Update a job source (partial; null config clears)' })
  @ApiOkResponse({ type: JobSourceAdminResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobSourceAdminDto,
  ): Promise<JobSourceAdminResponseDto> {
    return this.jobSourcesService.updateForAdmin(id, dto);
  }
}
