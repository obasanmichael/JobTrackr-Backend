import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';
import type { CurrentUser } from '../common/types/current-user.type';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserDecorator() currentUser: CurrentUser): Promise<UserProfileDto> {
    return this.usersService.getCurrentUserProfile(currentUser);
  }
}
