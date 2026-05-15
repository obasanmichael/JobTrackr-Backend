import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { ApplicationEventResponseDto } from './dto/application-event-response.dto';
import { CreateApplicationEventDto } from './dto/create-application-event.dto';
import { ApplicationEventsService } from './application-events.service';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('application-events')
@ApiBearerAuth('access-token')
export class ApplicationEventsController {
  constructor(private readonly applicationEventsService: ApplicationEventsService) {}

  @Post('applications/:id/events')
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) applicationId: string,
    @Body() payload: CreateApplicationEventDto,
  ): Promise<ApplicationEventResponseDto> {
    return this.applicationEventsService.createForApplication(
      currentUser,
      applicationId,
      payload,
    );
  }

  @Get('applications/:id/events')
  list(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) applicationId: string,
  ): Promise<ApplicationEventResponseDto[]> {
    return this.applicationEventsService.listForApplication(
      currentUser,
      applicationId,
    );
  }

  @Delete('application-events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ): Promise<void> {
    return this.applicationEventsService.removeById(currentUser, eventId);
  }
}
