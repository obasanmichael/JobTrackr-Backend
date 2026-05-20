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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OptionalCurrentUserDecorator } from '../common/decorators/optional-current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateJobSourceSubmissionDto } from './dto/create-job-source-submission.dto';
import { JobSourceSubmissionResponseDto } from './dto/job-source-submission-response.dto';
import { JOB_SOURCE_SUBMISSIONS_THROTTLE } from './job-source-submissions.constants';
import { JobSourceSubmissionsService } from './job-source-submissions.service';

@ApiTags('job-source-submissions')
@Controller('job-source-submissions')
export class JobSourceSubmissionsController {
  constructor(
    private readonly jobSourceSubmissionsService: JobSourceSubmissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle(JOB_SOURCE_SUBMISSIONS_THROTTLE)
  @ApiOperation({
    summary: 'Submit a company careers page for review (public; auth optional)',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ type: JobSourceSubmissionResponseDto })
  @ApiConflictResponse({
    description: 'A pending submission already exists for this careers URL',
  })
  @ApiTooManyRequestsResponse({
    description: 'Submission rate limit exceeded',
  })
  create(
    @Body() dto: CreateJobSourceSubmissionDto,
    @OptionalCurrentUserDecorator() submitterUser: CurrentUser | null,
    @Req() req: Request,
  ): Promise<JobSourceSubmissionResponseDto> {
    return this.jobSourceSubmissionsService.create(dto, {
      submitterUser,
      submitterIp: req.ip ?? null,
    });
  }
}
