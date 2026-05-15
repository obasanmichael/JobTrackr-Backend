import { EventTypeLiteral } from './event-type';

export class ApplicationEventResponseDto {
  id!: string;
  userId!: string;
  applicationId!: string;
  type!: EventTypeLiteral;
  title!: string;
  description?: string | null;
  createdAt!: Date;
}
