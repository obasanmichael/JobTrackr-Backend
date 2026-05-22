import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarSyncService } from '../calendar/calendar-sync.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewResponseDto } from './dto/interview-response.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly calendarSync: CalendarSyncService,
  ) {}

  async create(
    currentUser: CurrentUser,
    payload: CreateInterviewDto,
  ): Promise<InterviewResponseDto> {
    await this.ensureApplicationOwnership(
      currentUser.userId,
      payload.applicationId,
    );

    const created = await this.prismaService.interview.create({
      data: {
        userId: currentUser.userId,
        applicationId: payload.applicationId,
        stage: payload.stage,
        interviewType: payload.interviewType,
        scheduledAt: payload.scheduledAt,
        location: payload.location,
        meetingLink: payload.meetingLink,
        notes: payload.notes,
        outcome: payload.outcome,
      },
    });

    void this.calendarSync.syncInterviewIfEnabled(
      currentUser.userId,
      created.id,
    );

    return this.toResponse(created);
  }

  async findAll(currentUser: CurrentUser): Promise<InterviewResponseDto[]> {
    const interviews = await this.prismaService.interview.findMany({
      where: {
        userId: currentUser.userId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return interviews.map((interview) => this.toResponse(interview));
  }

  async findUpcoming(
    currentUser: CurrentUser,
  ): Promise<InterviewResponseDto[]> {
    const interviews = await this.prismaService.interview.findMany({
      where: {
        userId: currentUser.userId,
        scheduledAt: {
          gte: new Date(),
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    });

    return interviews.map((interview) => this.toResponse(interview));
  }

  async update(
    currentUser: CurrentUser,
    id: string,
    payload: UpdateInterviewDto,
  ): Promise<InterviewResponseDto> {
    const existing = await this.getOwnedInterviewOrThrow(
      currentUser.userId,
      id,
    );

    if (
      payload.applicationId &&
      payload.applicationId !== existing.applicationId
    ) {
      await this.ensureApplicationOwnership(
        currentUser.userId,
        payload.applicationId,
      );
    }

    const updated = await this.prismaService.interview.update({
      where: { id },
      data: {
        applicationId: payload.applicationId,
        stage: payload.stage,
        interviewType: payload.interviewType,
        scheduledAt: payload.scheduledAt,
        location: payload.location,
        meetingLink: payload.meetingLink,
        notes: payload.notes,
        outcome: payload.outcome,
      },
    });

    void this.calendarSync.syncInterviewIfEnabled(currentUser.userId, id);

    return this.toResponse(updated);
  }

  async remove(currentUser: CurrentUser, id: string): Promise<void> {
    await this.getOwnedInterviewOrThrow(currentUser.userId, id);

    await this.calendarSync.deleteInterviewFromCalendarIfConnected(
      currentUser.userId,
      id,
    );

    await this.prismaService.interview.delete({
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

  private async getOwnedInterviewOrThrow(
    userId: string,
    interviewId: string,
  ): Promise<{ id: string; applicationId: string }> {
    const interview = await this.prismaService.interview.findFirst({
      where: {
        id: interviewId,
        userId,
      },
      select: {
        id: true,
        applicationId: true,
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found.');
    }

    return interview;
  }

  private toResponse(interview: {
    id: string;
    userId: string;
    applicationId: string;
    stage: InterviewResponseDto['stage'];
    interviewType: InterviewResponseDto['interviewType'];
    scheduledAt: Date;
    location: string | null;
    meetingLink: string | null;
    notes: string | null;
    outcome: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): InterviewResponseDto {
    return {
      id: interview.id,
      userId: interview.userId,
      applicationId: interview.applicationId,
      stage: interview.stage,
      interviewType: interview.interviewType,
      scheduledAt: interview.scheduledAt,
      location: interview.location,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      outcome: interview.outcome,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }
}
