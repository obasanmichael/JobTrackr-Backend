import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExternalJob } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JobDetailDto } from './dto/job-detail.dto';
import type { JobListingDto } from './dto/job-listing.dto';
import type { JobSearchQueryDto } from './dto/job-search-query.dto';
import type { JobSearchResponseDto } from './dto/job-search-response.dto';
import {
  buildJobExcerpt,
  buildJobSearchWhere,
  remoteTypeToWorkMode,
} from './job-search.filters';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: JobSearchQueryDto): Promise<JobSearchResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = buildJobSearchWhere(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.externalJob.count({ where }),
      this.prisma.externalJob.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      jobs: rows.map((row) => JobsService.toListingDto(row)),
      total,
      page,
      limit,
    };
  }

  async findActiveById(id: string): Promise<JobDetailDto> {
    const row = await this.prisma.externalJob.findFirst({
      where: { id, isActive: true },
    });
    if (!row) {
      throw new NotFoundException('Job not found');
    }
    return JobsService.toDetailDto(row);
  }

  static toListingDto(row: ExternalJob): JobListingDto {
    return {
      id: row.id,
      title: row.title,
      companyName: row.company,
      location: row.location,
      workMode: remoteTypeToWorkMode(row.remoteType),
      applyUrl: row.applicationUrl,
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      currency: row.currency,
      source: row.sourceName,
      postedAt: row.postedAt?.toISOString() ?? null,
      excerpt: buildJobExcerpt(row.description),
    };
  }

  static toDetailDto(row: ExternalJob): JobDetailDto {
    return {
      ...JobsService.toListingDto(row),
      description: row.description,
      requirements: row.requirements,
      experienceLevel: row.experienceLevel,
      employmentType: row.employmentType,
      country: row.country,
    };
  }
}
