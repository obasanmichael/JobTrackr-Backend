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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import {
  CreateResumeReviewDto,
  ResumeReviewsQueryDto,
} from './dto/create-resume-review.dto';
import { ResumeReviewResponseDto } from './dto/resume-review-response.dto';
import { ResumeReviewsService } from './resume-reviews.service';

@Controller('resume-reviews')
@UseGuards(JwtAuthGuard)
@ApiTags('resume-reviews')
@ApiBearerAuth('access-token')
export class ResumeReviewsController {
  constructor(private readonly resumeReviewsService: ResumeReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Request GENERAL or JOB_SPECIFIC AI resume review (structured JSON validated server-side)',
  })
  @ApiCreatedResponse({ type: ResumeReviewResponseDto })
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: CreateResumeReviewDto,
  ): Promise<ResumeReviewResponseDto> {
    return this.resumeReviewsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List AI resume reviews for the current user' })
  @ApiOkResponse({ type: [ResumeReviewResponseDto] })
  findAll(
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: ResumeReviewsQueryDto,
  ): Promise<ResumeReviewResponseDto[]> {
    return this.resumeReviewsService.findAllForUser(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one resume review by id' })
  @ApiOkResponse({ type: ResumeReviewResponseDto })
  findOne(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeReviewResponseDto> {
    return this.resumeReviewsService.findOne(user, id);
  }
}
