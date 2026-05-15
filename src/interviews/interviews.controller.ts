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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewResponseDto } from './dto/interview-response.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: CreateInterviewDto,
  ): Promise<InterviewResponseDto> {
    return this.interviewsService.create(currentUser, payload);
  }

  @Get()
  findAll(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<InterviewResponseDto[]> {
    return this.interviewsService.findAll(currentUser);
  }

  @Get('upcoming')
  findUpcoming(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<InterviewResponseDto[]> {
    return this.interviewsService.findUpcoming(currentUser);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateInterviewDto,
  ): Promise<InterviewResponseDto> {
    return this.interviewsService.update(currentUser, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.interviewsService.remove(currentUser, id);
  }
}
