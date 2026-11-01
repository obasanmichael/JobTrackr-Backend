import { ApiProperty } from '@nestjs/swagger';
import { ApiTokenResponseDto } from './api-token-response.dto';

export class CreatedApiTokenResponseDto extends ApiTokenResponseDto {
  @ApiProperty({
    description: 'Plaintext token. Shown once; only its hash is stored.',
  })
  token!: string;
}
