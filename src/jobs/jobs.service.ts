import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JobDetailDto } from './dto/job-detail.dto';
import type { JobListingDto } from './dto/job-listing.dto';
import type { JobSearchQueryDto } from './dto/job-search-query.dto';
import type { JobSearchResponseDto } from './dto/job-search-response.dto';
import {
  mapExternalJobToListingDto,
  type ExternalJobListingRow,
} from './external-job.mapper';
import { externalJobPublicInclude } from './external-job-public.select';
import { buildJobSearchWhere } from './job-search.filters';

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
        include: externalJobPublicInclude,
        orderBy: [{ postedAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      jobs: rows.map((row) =>
        mapExternalJobToListingDto(row as ExternalJobListingRow),
      ),
      total,
      page,
      limit,
    };
  }

  async findActiveById(id: string): Promise<JobDetailDto> {
    const row = await this.prisma.externalJob.findFirst({
      where: { id, isActive: true, isSuspicious: false },
      include: externalJobPublicInclude,
    });
    if (!row) {
      throw new NotFoundException('Job not found');
    }
    return JobsService.toDetailDto(row as ExternalJobListingRow);
  }

  static toListingDto(row: ExternalJobListingRow): JobListingDto {
    return mapExternalJobToListingDto(row);
  }

  static toDetailDto(row: ExternalJobListingRow): JobDetailDto {
    return {
      ...mapExternalJobToListingDto(row),
      description: row.description,
      requirements: row.requirements,
      experienceLevel: row.experienceLevel,
      employmentType: row.employmentType,
      country: row.country,
    };
  }
}
