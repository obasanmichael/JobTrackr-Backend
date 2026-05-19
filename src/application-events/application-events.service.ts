import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { ApplicationEventResponseDto } from './dto/application-event-response.dto';
import { CreateApplicationEventDto } from './dto/create-application-event.dto';

@Injectable()
export class ApplicationEventsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createForApplication(
    currentUser: CurrentUser,
    applicationId: string,
    payload: CreateApplicationEventDto,
  ): Promise<ApplicationEventResponseDto> {
    await this.ensureApplicationOwnership(currentUser.userId, applicationId);

    const created = await this.prismaService.applicationEvent.create({
      data: {
        userId: currentUser.userId,
        applicationId,
        type: payload.type,
        title: payload.title,
        description: payload.description,
      },
    });

    return this.toResponse(created);
  }

  async listForApplication(
    currentUser: CurrentUser,
    applicationId: string,
  ): Promise<ApplicationEventResponseDto[]> {
    await this.ensureApplicationOwnership(currentUser.userId, applicationId);

    const events = await this.prismaService.applicationEvent.findMany({
      where: {
        userId: currentUser.userId,
        applicationId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return events.map((event) => this.toResponse(event));
  }

  async removeById(currentUser: CurrentUser, eventId: string): Promise<void> {
    await this.ensureEventOwnership(currentUser.userId, eventId);

    await this.prismaService.applicationEvent.delete({
      where: { id: eventId },
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

  private async ensureEventOwnership(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const event = await this.prismaService.applicationEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Application event not found.');
    }
  }

  private toResponse(event: {
    id: string;
    userId: string;
    applicationId: string;
    type: ApplicationEventResponseDto['type'];
    title: string;
    description: string | null;
    createdAt: Date;
  }): ApplicationEventResponseDto {
    return {
      id: event.id,
      userId: event.userId,
      applicationId: event.applicationId,
      type: event.type,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt,
    };
  }
}
