import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { JobMatchListResponseDto } from './dto/job-match-response.dto';
import { JobMatchingService } from './job-matching.service';
import { MATCHES_GENERATE_THROTTLE } from './matches.constants';

@ApiTags('matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MatchesController {
  constructor(private readonly jobMatchingService: JobMatchingService) {}

  @Get()
  @ApiOperation({
    summary: 'List ranked job matches for the current user (cached ≤24h)',
  })
  @ApiOkResponse({ type: JobMatchListResponseDto })
  list(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<JobMatchListResponseDto> {
    return this.jobMatchingService.listMatches(user);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Throttle(MATCHES_GENERATE_THROTTLE)
  @ApiOperation({
    summary: 'Force refresh of job matches for the current user',
  })
  @ApiOkResponse({ type: JobMatchListResponseDto })
  @ApiConflictResponse({
    description: 'User has no parsed resume / candidate profile yet',
  })
  @ApiTooManyRequestsResponse({
    description: 'Match generation rate limit exceeded',
  })
  generate(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<JobMatchListResponseDto> {
    return this.jobMatchingService.generateMatches(user);
  }
}
