import { Injectable, NotImplementedException } from '@nestjs/common';
import { CurrentUser } from '../common/types/current-user.type';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  create(
    _currentUser: CurrentUser,
    _payload: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    throw new NotImplementedException(
      'Stage 3 create application flow not implemented yet.',
    );
  }

  findAll(
    _currentUser: CurrentUser,
    _query: ApplicationQueryDto,
  ): Promise<ApplicationResponseDto[]> {
    throw new NotImplementedException(
      'Stage 3 list applications flow not implemented yet.',
    );
  }

  findOne(
    _currentUser: CurrentUser,
    _id: string,
  ): Promise<ApplicationResponseDto> {
    throw new NotImplementedException(
      'Stage 3 get application flow not implemented yet.',
    );
  }

  update(
    _currentUser: CurrentUser,
    _id: string,
    _payload: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    throw new NotImplementedException(
      'Stage 3 update application flow not implemented yet.',
    );
  }

  remove(_currentUser: CurrentUser, _id: string): Promise<void> {
    throw new NotImplementedException(
      'Stage 3 delete application flow not implemented yet.',
    );
  }
}
