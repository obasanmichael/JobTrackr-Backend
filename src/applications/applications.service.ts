import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../common/types/current-user.type';
import { ApplicationStatus } from './dto/application.enums';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    currentUser: CurrentUser,
    payload: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const created = await this.prismaService.jobApplication.create({
      data: {
        userId: currentUser.userId,
        jobTitle: payload.jobTitle,
        companyName: payload.companyName,
        jobUrl: payload.jobUrl,
        location: payload.location,
        workMode: payload.workMode,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        currency: payload.currency,
        status: payload.status,
        source: payload.source,
        deadline: payload.deadline,
        notes: payload.notes,
      },
    });

    return this.toApplicationResponse(created);
  }

  async findAll(
    currentUser: CurrentUser,
    query: ApplicationQueryDto,
  ): Promise<ApplicationResponseDto[]> {
    const normalizedSearch = query.search?.trim();
    const orderBy = this.buildOrderBy(query.sort);

    const applications = await this.prismaService.jobApplication.findMany({
      where: {
        userId: currentUser.userId,
        status: query.status,
        OR: normalizedSearch
          ? [
              {
                jobTitle: { contains: normalizedSearch, mode: 'insensitive' },
              },
              {
                companyName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      orderBy,
    });

    return applications.map((application) =>
      this.toApplicationResponse(application),
    );
  }

  async findOne(
    currentUser: CurrentUser,
    id: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.prismaService.jobApplication.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    return this.toApplicationResponse(application);
  }

  async update(
    currentUser: CurrentUser,
    id: string,
    payload: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const existing = await this.getOwnedApplicationOrThrow(
      currentUser.userId,
      id,
    );

    const updated = await this.prismaService.jobApplication.update({
      where: { id },
      data: {
        jobTitle: payload.jobTitle,
        companyName: payload.companyName,
        jobUrl: payload.jobUrl,
        location: payload.location,
        workMode: payload.workMode,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        currency: payload.currency,
        status: payload.status,
        source: payload.source,
        deadline: payload.deadline,
        notes: payload.notes,
      },
    });

    if (payload.status && payload.status !== existing.status) {
      await this.prismaService.applicationEvent.create({
        data: {
          userId: currentUser.userId,
          applicationId: updated.id,
          type: 'STATUS_CHANGE',
          title: this.buildStatusChangeTitle(existing.status, payload.status),
        },
      });
    }

    return this.toApplicationResponse(updated);
  }

  async remove(currentUser: CurrentUser, id: string): Promise<void> {
    await this.getOwnedApplicationOrThrow(currentUser.userId, id);

    await this.prismaService.jobApplication.delete({
      where: { id },
    });
  }

  private async getOwnedApplicationOrThrow(
    userId: string,
    applicationId: string,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    const existing = await this.prismaService.jobApplication.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('Application not found.');
    }

    return existing;
  }

  private buildStatusChangeTitle(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
  ): string {
    return `Status changed from ${this.humanizeStatus(fromStatus)} to ${this.humanizeStatus(toStatus)}`;
  }

  private humanizeStatus(status: ApplicationStatus): string {
    return status
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  private buildOrderBy(
    sort?: ApplicationQueryDto['sort'],
  ): Array<Record<string, unknown>> {
    if (sort === 'deadline') {
      return [
        { deadline: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ];
    }

    return [{ createdAt: 'desc' }, { id: 'desc' }];
  }

  private toApplicationResponse(application: {
    id: string;
    userId: string;
    jobTitle: string;
    companyName: string;
    jobUrl: string | null;
    location: string | null;
    workMode: ApplicationResponseDto['workMode'];
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    status: ApplicationResponseDto['status'];
    source: ApplicationResponseDto['source'];
    deadline: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApplicationResponseDto {
    return {
      id: application.id,
      userId: application.userId,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      jobUrl: application.jobUrl,
      location: application.location,
      workMode: application.workMode,
      salaryMin: application.salaryMin,
      salaryMax: application.salaryMax,
      currency: application.currency,
      status: application.status,
      source: application.source,
      deadline: application.deadline,
      notes: application.notes,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
