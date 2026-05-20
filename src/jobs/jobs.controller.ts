import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobDetailDto } from './dto/job-detail.dto';
import { JobSearchQueryDto } from './dto/job-search-query.dto';
import { JobSearchResponseDto } from './dto/job-search-response.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiTags('jobs')
@ApiBearerAuth('access-token')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search aggregated external job postings',
  })
  @ApiOkResponse({ type: JobSearchResponseDto })
  search(@Query() query: JobSearchQueryDto): Promise<JobSearchResponseDto> {
    return this.jobsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active external job posting by id' })
  @ApiOkResponse({ type: JobDetailDto })
  @ApiNotFoundResponse({ description: 'Job not found or inactive' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<JobDetailDto> {
    return this.jobsService.findActiveById(id);
  }
}
