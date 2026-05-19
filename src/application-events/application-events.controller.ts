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
import { ApplicationEventResponseDto } from './dto/application-event-response.dto';
import { CreateApplicationEventDto } from './dto/create-application-event.dto';
import { ApplicationEventsService } from './application-events.service';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('application-events')
@ApiBearerAuth('access-token')
export class ApplicationEventsController {
  constructor(
    private readonly applicationEventsService: ApplicationEventsService,
  ) {}

  @Post('applications/:id/events')
  @ApiOperation({ summary: 'Create an event for an application timeline' })
  @ApiBody({ type: CreateApplicationEventDto })
  @ApiCreatedResponse({ type: ApplicationEventResponseDto })
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
  @ApiOperation({ summary: 'List timeline events for an application' })
  @ApiOkResponse({ type: ApplicationEventResponseDto, isArray: true })
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
  @ApiOperation({ summary: 'Delete an application event' })
  @ApiNoContentResponse()
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ): Promise<void> {
    return this.applicationEventsService.removeById(currentUser, eventId);
  }
}
