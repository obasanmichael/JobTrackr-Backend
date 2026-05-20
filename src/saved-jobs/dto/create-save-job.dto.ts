import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/** `ExternalJob.id` from `GET /jobs/:id` (normalized listing UUID). */
export class CreateSaveJobDto {
  @ApiProperty({
    description:
      'Internal id of an active external job listing (`ExternalJob.id`)',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsNotEmpty()
  externalJobId!: string;
}
