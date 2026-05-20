import { ApiProperty } from '@nestjs/swagger';
import { ApplicationResponseDto } from '../../applications/dto/application-response.dto';
import { SavedJobResponseDto } from './saved-job-response.dto';

export class ConvertSavedJobResponseDto {
  @ApiProperty({ type: ApplicationResponseDto })
  application!: ApplicationResponseDto;

  @ApiProperty({ type: SavedJobResponseDto })
  savedJob!: SavedJobResponseDto;
}
