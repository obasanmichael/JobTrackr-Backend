import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    currentUser: CurrentUser,
    payload: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    await this.ensureApplicationOwnership(
      currentUser.userId,
      payload.applicationId,
    );

    const created = await this.prismaService.reminder.create({
      data: {
        userId: currentUser.userId,
        applicationId: payload.applicationId,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
      },
    });

    return this.toResponse(created);
  }

  async findAll(currentUser: CurrentUser): Promise<ReminderResponseDto[]> {
    const reminders = await this.prismaService.reminder.findMany({
      where: {
        userId: currentUser.userId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return reminders.map((reminder) => this.toResponse(reminder));
  }

  async findUpcoming(currentUser: CurrentUser): Promise<ReminderResponseDto[]> {
    const reminders = await this.prismaService.reminder.findMany({
      where: {
        userId: currentUser.userId,
        isCompleted: false,
        dueDate: {
          gte: new Date(),
        },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });

    return reminders.map((reminder) => this.toResponse(reminder));
  }

  async update(
    currentUser: CurrentUser,
    id: string,
    payload: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    const existing = await this.getOwnedReminderOrThrow(currentUser.userId, id);

    if (payload.applicationId && payload.applicationId !== existing.applicationId) {
      await this.ensureApplicationOwnership(
        currentUser.userId,
        payload.applicationId,
      );
    }

    const updated = await this.prismaService.reminder.update({
      where: { id },
      data: {
        applicationId: payload.applicationId,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        isCompleted: payload.isCompleted,
      },
    });

    return this.toResponse(updated);
  }

  async remove(currentUser: CurrentUser, id: string): Promise<void> {
    await this.getOwnedReminderOrThrow(currentUser.userId, id);

    await this.prismaService.reminder.delete({
      where: { id },
    });
  }

  private async ensureApplicationOwnership(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prismaService.jobApplication.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      select: { id: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }
  }

  private async getOwnedReminderOrThrow(
    userId: string,
    reminderId: string,
  ): Promise<{ id: string; applicationId: string }> {
    const reminder = await this.prismaService.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
      select: {
        id: true,
        applicationId: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found.');
    }

    return reminder;
  }

  private toResponse(reminder: {
    id: string;
    userId: string;
    applicationId: string;
    title: string;
    description: string | null;
    dueDate: Date;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ReminderResponseDto {
    return {
      id: reminder.id,
      userId: reminder.userId,
      applicationId: reminder.applicationId,
      title: reminder.title,
      description: reminder.description,
      dueDate: reminder.dueDate,
      isCompleted: reminder.isCompleted,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
