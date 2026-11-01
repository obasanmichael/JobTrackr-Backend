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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokenResponseDto } from './dto/api-token-response.dto';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { CreatedApiTokenResponseDto } from './dto/created-api-token-response.dto';

/**
 * Token management is JWT-only on purpose: a leaked API token must not be able
 * to mint further tokens.
 */
@ApiTags('API tokens')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  @ApiOperation({ summary: 'Create a personal access token (shown once)' })
  @ApiCreatedResponse({ type: CreatedApiTokenResponseDto })
  create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: CreateApiTokenDto,
  ): Promise<CreatedApiTokenResponseDto> {
    return this.apiTokensService.create(currentUser, payload);
  }

  @Get()
  @ApiOperation({ summary: 'List active personal access tokens' })
  @ApiOkResponse({ type: ApiTokenResponseDto, isArray: true })
  list(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<ApiTokenResponseDto[]> {
    return this.apiTokensService.list(currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a personal access token' })
  @ApiNoContentResponse()
  revoke(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.apiTokensService.revoke(currentUser, id);
  }
}
