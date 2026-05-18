import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobSearchQueryDto } from './dto/job-search-query.dto';
import { JobSearchResponseDto } from './dto/job-search-response.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiTags('jobs')
@ApiBearerAuth('access-token')
export class JobsController {
  /**
   * Placeholder aggregator: returns an empty feed until ingestion is implemented.
   * Query params validate and echo pagination so clients can stabilize early.
   */
  @Get()
  @ApiOperation({
    summary: 'Search aggregated job postings (pagination contract; listings TBD)',
  })
  @ApiOkResponse({ type: JobSearchResponseDto })
  search(@Query() query: JobSearchQueryDto): JobSearchResponseDto {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    void query.q;
    void query.location;
    void query.workMode;

    return {
      jobs: [],
      total: 0,
      page,
      limit,
    };
  }
}
