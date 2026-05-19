import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JobSource } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateJobSourceAdminDto } from './dto/create-job-source-admin.dto';
import type { JobSourceAdminResponseDto } from './dto/job-source-admin-response.dto';
import type { UpdateJobSourceAdminDto } from './dto/update-job-source-admin.dto';

@Injectable()
export class JobSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(): Promise<JobSourceAdminResponseDto[]> {
    const rows = await this.prisma.jobSource.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => JobSourcesService.toAdminDto(row));
  }

  async createForAdmin(
    dto: CreateJobSourceAdminDto,
  ): Promise<JobSourceAdminResponseDto> {
    const row = await this.prisma.jobSource.create({
      data: {
        name: dto.name,
        type: dto.type,
        baseUrl: dto.baseUrl ?? null,
        requiresApiKey: dto.requiresApiKey ?? false,
        isActive: dto.isActive ?? true,
        ...JobSourcesService.configCreateInput(dto.config),
      },
    });
    return JobSourcesService.toAdminDto(row);
  }

  async updateForAdmin(
    id: string,
    dto: UpdateJobSourceAdminDto,
  ): Promise<JobSourceAdminResponseDto> {
    const existing = await this.prisma.jobSource.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Job source not found');
    }

    const data = JobSourcesService.buildUpdateData(dto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }
    const row = await this.prisma.jobSource.update({
      where: { id },
      data,
    });
    return JobSourcesService.toAdminDto(row);
  }

  private static configCreateInput(
    config: Record<string, unknown> | null | undefined,
  ): Pick<Prisma.JobSourceCreateInput, 'config'> | Record<PropertyKey, never> {
    if (config === undefined) {
      return {};
    }
    if (config === null) {
      return { config: Prisma.DbNull };
    }
    return { config: config as Prisma.InputJsonValue };
  }

  /** Maps PATCH body fields to Prisma update; clears JSON when config is explicitly null. */
  private static buildUpdateData(
    dto: UpdateJobSourceAdminDto,
  ): Prisma.JobSourceUpdateInput {
    const data: Prisma.JobSourceUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }
    if (dto.baseUrl !== undefined) {
      data.baseUrl = dto.baseUrl;
    }
    if (dto.requiresApiKey !== undefined) {
      data.requiresApiKey = dto.requiresApiKey;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.config !== undefined) {
      data.config =
        dto.config === null
          ? Prisma.DbNull
          : (dto.config as Prisma.InputJsonValue);
    }
    return data;
  }

  private static toAdminDto(row: JobSource): JobSourceAdminResponseDto {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.baseUrl,
      isActive: row.isActive,
      requiresApiKey: row.requiresApiKey,
      config: JobSourcesService.adminConfigFromRow(row.config),
      lastSyncAt: row.lastSyncAt,
      lastSuccessAt: row.lastSuccessAt,
      lastErrorAt: row.lastErrorAt,
      lastErrorMessage: row.lastErrorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private static adminConfigFromRow(
    value: unknown,
  ): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}
