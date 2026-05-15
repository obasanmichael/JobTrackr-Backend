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
  Query,
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
import { ApplicationQueryDto } from './dto/application-query.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationsService } from './applications.service';
import type { CurrentUser } from '../common/types/current-user.type';

@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiTags('applications')
@ApiBearerAuth('access-token')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job application' })
  @ApiBody({ type: CreateApplicationDto })
  @ApiCreatedResponse({ type: ApplicationResponseDto })
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(currentUser, payload);
  }

  @Get()
  @ApiOperation({ summary: 'List user job applications' })
  @ApiOkResponse({ type: ApplicationResponseDto, isArray: true })
  findAll(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationsService.findAll(currentUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job application' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  findOne(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.findOne(currentUser, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job application' })
  @ApiBody({ type: UpdateApplicationDto })
  @ApiOkResponse({ type: ApplicationResponseDto })
  update(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.update(currentUser, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job application' })
  @ApiNoContentResponse()
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.applicationsService.remove(currentUser, id);
  }
}
