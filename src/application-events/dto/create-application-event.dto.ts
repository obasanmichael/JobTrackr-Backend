import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { EVENT_TYPES } from './event-type';
import type { EventTypeLiteral } from './event-type';

export class CreateApplicationEventDto {
  @IsIn(EVENT_TYPES)
  type!: EventTypeLiteral;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;
}
