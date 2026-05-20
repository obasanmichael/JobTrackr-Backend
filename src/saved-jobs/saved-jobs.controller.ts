import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { ConvertSavedJobResponseDto } from './dto/convert-saved-job-response.dto';
import { ConvertSavedJobDto } from './dto/convert-saved-job.dto';
import { CreateSaveJobDto } from './dto/create-save-job.dto';
import { PatchSavedJobDto } from './dto/patch-saved-job.dto';
import {
  SavedJobListResponseDto,
  SavedJobResponseDto,
} from './dto/saved-job-response.dto';
import { SavedJobsQueryDto } from './dto/saved-jobs-query.dto';
import { SavedJobsService } from './saved-jobs.service';

@Controller('saved-jobs')
@UseGuards(JwtAuthGuard)
@ApiTags('saved-jobs')
@ApiBearerAuth('access-token')
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save or refresh a job listing bookmark (upsert/idempotent)',
  })
  @ApiOkResponse({ type: SavedJobResponseDto })
  save(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: CreateSaveJobDto,
  ): Promise<SavedJobResponseDto> {
    return this.savedJobsService.save(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List saved jobs with embedded listing snapshot' })
  @ApiOkResponse({ type: SavedJobListResponseDto })
  list(
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: SavedJobsQueryDto,
  ): Promise<SavedJobListResponseDto> {
    return this.savedJobsService.findAllPaginated(user, query);
  }

  @Patch(':savedJobId')
  @ApiOperation({ summary: 'Update notes or soft-dismiss via status' })
  @ApiOkResponse({ type: SavedJobResponseDto })
  patch(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('savedJobId') savedJobId: string,
    @Body() dto: PatchSavedJobDto,
  ): Promise<SavedJobResponseDto> {
    return this.savedJobsService.patch(user, savedJobId, dto);
  }

  @Post(':savedJobId/convert-to-application')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a V1 JobApplication from this bookmark and timeline it',
  })
  @ApiOkResponse({ type: ConvertSavedJobResponseDto })
  convert(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('savedJobId') savedJobId: string,
    @Body() dto: ConvertSavedJobDto,
  ): Promise<ConvertSavedJobResponseDto> {
    return this.savedJobsService.convert(user, savedJobId, dto);
  }

  @Delete(':savedJobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove bookmark' })
  @ApiNoContentResponse()
  remove(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('savedJobId') savedJobId: string,
  ): Promise<void> {
    return this.savedJobsService.remove(user, savedJobId);
  }
}
