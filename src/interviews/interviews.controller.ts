import {
  Body,
  Controller,
  Delete,
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
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewResponseDto } from './dto/interview-response.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
@ApiTags('interviews')
@ApiBearerAuth('access-token')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an interview' })
  @ApiBody({ type: CreateInterviewDto })
  @ApiCreatedResponse({ type: InterviewResponseDto })
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: CreateInterviewDto,
  ): Promise<InterviewResponseDto> {
    return this.interviewsService.create(currentUser, payload);
  }

  @Get()
  @ApiOperation({ summary: 'List all interviews for current user' })
  @ApiOkResponse({ type: InterviewResponseDto, isArray: true })
  findAll(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<InterviewResponseDto[]> {
    return this.interviewsService.findAll(currentUser);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'List upcoming interviews ordered by scheduled date' })
  @ApiOkResponse({ type: InterviewResponseDto, isArray: true })
  findUpcoming(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<InterviewResponseDto[]> {
    return this.interviewsService.findUpcoming(currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an interview' })
  @ApiBody({ type: UpdateInterviewDto })
  @ApiOkResponse({ type: InterviewResponseDto })
  update(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateInterviewDto,
  ): Promise<InterviewResponseDto> {
    return this.interviewsService.update(currentUser, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an interview' })
  @ApiNoContentResponse()
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.interviewsService.remove(currentUser, id);
  }
}
