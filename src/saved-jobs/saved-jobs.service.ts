import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SavedJob } from '@prisma/client';
import {
  SavedJobStatus as SavedJobStatusEnum,
  type SavedJobStatus,
} from '@prisma/client';
import { ApplicationEventsService } from '../application-events/application-events.service';
import type { CreateApplicationEventDto } from '../application-events/dto/create-application-event.dto';
import { ApplicationsService } from '../applications/applications.service';
import type { CurrentUser } from '../common/types/current-user.type';
import type { ExternalJobListingRow } from '../jobs/external-job.mapper';
import { mapExternalJobToListingDto } from '../jobs/external-job.mapper';
import { externalJobPublicInclude } from '../jobs/external-job-public.select';
import { PrismaService } from '../prisma/prisma.service';
import type { ConvertSavedJobResponseDto } from './dto/convert-saved-job-response.dto';
import type { ConvertSavedJobDto } from './dto/convert-saved-job.dto';
import type { CreateSaveJobDto } from './dto/create-save-job.dto';
import type { PatchSavedJobDto } from './dto/patch-saved-job.dto';
import type {
  SavedJobListResponseDto,
  SavedJobResponseDto,
} from './dto/saved-job-response.dto';
import type { SavedJobsQueryDto } from './dto/saved-jobs-query.dto';
import { mapExternalListingToCreateApplicationDto } from './map-external-job-to-create-application';

type SavedJobWithListingInclude = SavedJob & {
  listing: ExternalJobListingRow;
};

@Injectable()
export class SavedJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationsService: ApplicationsService,
    private readonly applicationEventsService: ApplicationEventsService,
  ) {}

  async save(
    currentUser: CurrentUser,
    dto: CreateSaveJobDto,
  ): Promise<SavedJobResponseDto> {
    const listing = await this.prisma.externalJob.findFirst({
      where: {
        id: dto.externalJobId,
        isActive: true,
        isSuspicious: false,
      },
      include: externalJobPublicInclude,
    });

    if (!listing) {
      throw new NotFoundException(
        'Job listing not found or not available for saving.',
      );
    }

    const existing = await this.prisma.savedJob.findUnique({
      where: {
        userId_jobListingId: {
          userId: currentUser.userId,
          jobListingId: dto.externalJobId,
        },
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });

    if (existing) {
      const row =
        existing.status === SavedJobStatusEnum.DISMISSED
          ? await this.prisma.savedJob.update({
              where: { id: existing.id },
              data: { status: SavedJobStatusEnum.SAVED },
              include: {
                listing: { include: externalJobPublicInclude },
              },
            })
          : existing;

      return this.toSavedJobResponse(row);
    }

    const created = await this.prisma.savedJob.create({
      data: {
        userId: currentUser.userId,
        jobListingId: dto.externalJobId,
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });

    return this.toSavedJobResponse(created);
  }

  async findAllPaginated(
    currentUser: CurrentUser,
    query: SavedJobsQueryDto,
  ): Promise<SavedJobListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const dismissedOnly = query.dismissedOnly === true;
    const includeConverted = query.includeConverted === true;

    type WhereStatus =
      | { status: SavedJobStatus }
      | { status: { in: SavedJobStatus[] } };

    let statusFilter: WhereStatus;

    if (dismissedOnly) {
      statusFilter = { status: SavedJobStatusEnum.DISMISSED };
    } else if (!includeConverted) {
      statusFilter = { status: SavedJobStatusEnum.SAVED };
    } else {
      statusFilter = {
        status: {
          in: [
            SavedJobStatusEnum.SAVED,
            SavedJobStatusEnum.CONVERTED_TO_APPLICATION,
          ],
        },
      };
    }

    const where = {
      userId: currentUser.userId,
      ...statusFilter,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.savedJob.count({ where }),
      this.prisma.savedJob.findMany({
        where,
        include: {
          listing: { include: externalJobPublicInclude },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((r) =>
        this.toSavedJobResponse(r as SavedJobWithListingInclude),
      ),
      total,
      page,
      limit,
    };
  }

  async patch(
    currentUser: CurrentUser,
    savedJobId: string,
    dto: PatchSavedJobDto,
  ): Promise<SavedJobResponseDto> {
    await this.getOwnedSavedOrThrow(currentUser.userId, savedJobId);

    if (dto.status === SavedJobStatusEnum.CONVERTED_TO_APPLICATION) {
      throw new UnprocessableEntityException(
        'Status CONVERTED_TO_APPLICATION is only set via convert.',
      );
    }

    const updated = await this.prisma.savedJob.update({
      where: { id: savedJobId },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });

    return this.toSavedJobResponse(updated);
  }

  async remove(currentUser: CurrentUser, savedJobId: string): Promise<void> {
    const owned = await this.prisma.savedJob.findFirst({
      where: {
        id: savedJobId,
        userId: currentUser.userId,
      },
    });
    if (!owned) {
      throw new NotFoundException('Saved job not found.');
    }

    await this.prisma.savedJob.delete({ where: { id: owned.id } });
  }

  async convert(
    currentUser: CurrentUser,
    savedJobId: string,
    dto: ConvertSavedJobDto,
  ): Promise<ConvertSavedJobResponseDto> {
    const row = await this.prisma.savedJob.findFirst({
      where: {
        id: savedJobId,
        userId: currentUser.userId,
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });

    if (!row) {
      throw new NotFoundException('Saved job not found.');
    }

    const listingRow = row.listing;

    if (!listingRow.isActive || listingRow.isSuspicious) {
      throw new NotFoundException('Job listing not available for conversion.');
    }

    if (
      row.status === SavedJobStatusEnum.CONVERTED_TO_APPLICATION &&
      row.convertedApplicationId
    ) {
      const application = await this.applicationsService.findOne(
        currentUser,
        row.convertedApplicationId,
      );
      return {
        application,
        savedJob: await this.savedJobDtoFromId(row.id, currentUser.userId),
      };
    }

    const payload = mapExternalListingToCreateApplicationDto(listingRow, {
      savedNotes: row.notes,
      notesAppend: dto.notesAppend,
    });

    const application = await this.applicationsService.create(
      currentUser,
      payload,
    );

    await this.recordConversionTimeline(
      currentUser,
      application.id,
      listingRow,
    );

    const updated = await this.prisma.savedJob.update({
      where: { id: row.id },
      data: {
        status: SavedJobStatusEnum.CONVERTED_TO_APPLICATION,
        convertedApplicationId: application.id,
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });

    return {
      application,
      savedJob: this.toSavedJobResponse(updated),
    };
  }

  private async recordConversionTimeline(
    currentUser: CurrentUser,
    applicationId: string,
    listingRow: SavedJobWithListingInclude['listing'],
  ): Promise<void> {
    const eventPayload: CreateApplicationEventDto = {
      type: 'GENERAL_UPDATE',
      title: `Converted saved job (${listingRow.title})`,
      description: `Imported from aggregated listing ${listingRow.id} (${listingRow.sourceName}).`,
    };

    await this.applicationEventsService.createForApplication(
      currentUser,
      applicationId,
      eventPayload,
    );
  }

  private async savedJobDtoFromId(
    id: string,
    userId: string,
  ): Promise<SavedJobResponseDto> {
    const row = await this.prisma.savedJob.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        listing: { include: externalJobPublicInclude },
      },
    });
    if (!row) {
      throw new NotFoundException('Saved job not found.');
    }
    return this.toSavedJobResponse(row);
  }

  private async getOwnedSavedOrThrow(
    userId: string,
    savedJobId: string,
  ): Promise<void> {
    const row = await this.prisma.savedJob.findFirst({
      where: {
        id: savedJobId,
        userId,
      },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Saved job not found.');
    }
  }

  private toSavedJobResponse(
    row: SavedJobWithListingInclude,
  ): SavedJobResponseDto {
    return {
      id: row.id,
      status: row.status,
      notes: row.notes,
      convertedApplicationId: row.convertedApplicationId,
      jobListingId: row.jobListingId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      job: mapExternalJobToListingDto(row.listing),
    };
  }
}
