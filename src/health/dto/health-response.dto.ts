import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: '2026-05-15T18:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 1234.56 })
  uptime!: number;
}
