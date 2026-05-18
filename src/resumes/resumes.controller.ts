import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CandidateProfileResponseDto } from './dto/candidate-profile-response.dto';
import { ResumeResponseDto } from './dto/resume-response.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumesService } from './resumes.service';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
@ApiTags('resumes')
@ApiBearerAuth('access-token')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'List resumes for the current user' })
  @ApiOkResponse({ type: [ResumeResponseDto] })
  list(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<ResumeResponseDto[]> {
    return this.resumesService.listForUser(currentUser);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a resume (PDF or DOCX), store, and parse text' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: ResumeResponseDto })
  upload(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ResumeResponseDto> {
    return this.resumesService.uploadAndParse(currentUser, file);
  }

  @Get(':id/profile')
  @ApiOperation({
    summary: 'Get candidate profile for a resume (created after parsing)',
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  getProfile(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', ParseUUIDPipe) resumeId: string,
  ): Promise<CandidateProfileResponseDto> {
    return this.resumesService.getOrCreateProfile(currentUser, resumeId);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'Update candidate profile extracted from this resume' })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  updateProfile(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', ParseUUIDPipe) resumeId: string,
    @Body() dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponseDto> {
    return this.resumesService.updateProfile(currentUser, resumeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single resume' })
  @ApiOkResponse({ type: ResumeResponseDto })
  getOne(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', ParseUUIDPipe) resumeId: string,
  ): Promise<ResumeResponseDto> {
    return this.resumesService.findOne(currentUser, resumeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resume metadata (e.g. active resume)' })
  @ApiOkResponse({ type: ResumeResponseDto })
  updateResume(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', ParseUUIDPipe) resumeId: string,
    @Body() dto: UpdateResumeDto,
  ): Promise<ResumeResponseDto> {
    return this.resumesService.updateResume(currentUser, resumeId, dto);
  }
}
