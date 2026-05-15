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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
@ApiTags('reminders')
@ApiBearerAuth('access-token')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.remindersService.create(currentUser, payload);
  }

  @Get()
  findAll(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<ReminderResponseDto[]> {
    return this.remindersService.findAll(currentUser);
  }

  @Get('upcoming')
  findUpcoming(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<ReminderResponseDto[]> {
    return this.remindersService.findUpcoming(currentUser);
  }

  @Patch(':id')
  update(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.remindersService.update(currentUser, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.remindersService.remove(currentUser, id);
  }
}
