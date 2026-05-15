export class ReminderResponseDto {
  id!: string;
  userId!: string;
  applicationId!: string;
  title!: string;
  description?: string | null;
  dueDate!: Date;
  isCompleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
