import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobMatchingService } from '../job-matching/job-matching.service';
import { JobDetailDto } from './dto/job-detail.dto';
import { JobSearchQueryDto } from './dto/job-search-query.dto';
import { JobSearchResponseDto } from './dto/job-search-response.dto';
import { JobSingleMatchResponseDto } from '../job-matching/dto/job-match-response.dto';
import { JobsService } from './jobs.service';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiTags('jobs')
@ApiBearerAuth('access-token')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobMatchingService: JobMatchingService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search aggregated external job postings',
  })
  @ApiOkResponse({ type: JobSearchResponseDto })
  search(@Query() query: JobSearchQueryDto): Promise<JobSearchResponseDto> {
    return this.jobsService.search(query);
  }

  @Get(':id/match')
  @ApiOperation({ summary: 'Score one active job against the current user profile' })
  @ApiOkResponse({ type: JobSingleMatchResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found or inactive' })
  matchOne(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobSingleMatchResponseDto> {
    return this.jobMatchingService.matchJobForUser(user, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active external job posting by id' })
  @ApiOkResponse({ type: JobDetailDto })
  @ApiNotFoundResponse({ description: 'Job not found or inactive' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<JobDetailDto> {
    return this.jobsService.findActiveById(id);
  }
}
