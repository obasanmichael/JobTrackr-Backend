import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  me(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<UserProfileDto> {
    return this.usersService.getCurrentUserProfile(currentUser);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  updateMe(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateCurrentUserProfile(currentUser, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload or replace current user avatar' })
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
  @ApiOkResponse({ type: UserProfileDto })
  uploadAvatar(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserProfileDto> {
    return this.usersService.uploadAvatar(currentUser, file);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove current user avatar' })
  @ApiOkResponse({ type: UserProfileDto })
  deleteAvatar(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<UserProfileDto> {
    return this.usersService.deleteAvatar(currentUser);
  }
}
