import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildExternalJobUpsertArgs } from './normalization/generic-job-listing-to-prisma';
import { parseGenericJobListing } from './normalization/generic-job-listing.schema';
import type { JobSourceSyncPort } from './sync/job-source-sync.port';
import { JOB_SOURCE_SYNC_PORT } from './sync/job-source-sync.tokens';

const UPSERT_CHUNK = 50;
const MAX_HEALTH_MESSAGE = 3_900;

export type JobIngestSyncResult = {
  upsertedCount: number;
  skippedInvalid: number;
  /** Same timestamp written to JobSource.lastSyncAt / lastSuccessAt on success. */
  syncedAt: Date;
};

export type JobSourceBulkSyncItemResult = {
  jobSourceId: string;
  name: string;
  ok: boolean;
  upsertedCount?: number;
  skippedInvalid?: number;
  syncedAt?: Date;
  errorMessage?: string;
};

export type JobSourceBulkSyncResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  results: JobSourceBulkSyncItemResult[];
};

@Injectable()
export class JobIngestOrchestrationService {
  private readonly logger = new Logger(JobIngestOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_SOURCE_SYNC_PORT) private readonly syncPort: JobSourceSyncPort,
  ) {}

  /**
   * Load source → fetch raw listings → validate & map → chunked upserts → refresh health timestamps.
   * Phase D exposes this via admin HTTP; callers may catch {@link BadGatewayException} on failures.
   */
  async syncExternalJobs(jobSourceId: string): Promise<JobIngestSyncResult> {
    const sourceRow = await this.prisma.jobSource.findUnique({
      where: { id: jobSourceId },
    });

    if (!sourceRow) {
      throw new NotFoundException('Job source not found');
    }

    const syncedAt = new Date();
    let upsertedCount = 0;
    let skippedInvalid = 0;

    try {
      const snapshot = await this.syncPort.fetchSnapshot({
        id: sourceRow.id,
        name: sourceRow.name,
        type: sourceRow.type,
        baseUrl: sourceRow.baseUrl,
        requiresApiKey: sourceRow.requiresApiKey,
        isActive: sourceRow.isActive,
        config: sourceRow.config,
      });

      const upsertArgsList: Pick<
        Prisma.ExternalJobUpsertArgs,
        'where' | 'create' | 'update'
      >[] = [];

      for (const raw of snapshot.rawListings) {
        const normalized = parseGenericJobListing(raw);
        if (!normalized.ok) {
          skippedInvalid++;
          continue;
        }
        upsertArgsList.push(
          buildExternalJobUpsertArgs(
            sourceRow.id,
            sourceRow.name,
            normalized.value,
            JobIngestOrchestrationService.rawToJson(raw),
          ),
        );
      }

      for (let i = 0; i < upsertArgsList.length; i += UPSERT_CHUNK) {
        const chunk = upsertArgsList.slice(i, i + UPSERT_CHUNK);
        await this.prisma.$transaction(
          chunk.map((args) =>
            this.prisma.externalJob.upsert({
              ...args,
            }),
          ),
        );
        upsertedCount += chunk.length;
      }

      if (skippedInvalid > 0) {
        this.logger.warn(
          `Ingest skipped ${skippedInvalid} invalid listing(s) for JobSource ${jobSourceId}`,
        );
      }

      await this.prisma.jobSource.update({
        where: { id: jobSourceId },
        data: {
          lastSyncAt: syncedAt,
          lastSuccessAt: syncedAt,
          lastErrorAt: null,
          lastErrorMessage: null,
        },
      });

      return { upsertedCount, skippedInvalid, syncedAt };
    } catch (error) {
      const message = JobIngestOrchestrationService.truncateErrorMessage(error);

      await this.prisma.jobSource.update({
        where: { id: jobSourceId },
        data: {
          lastSyncAt: syncedAt,
          lastErrorAt: syncedAt,
          lastErrorMessage: message,
        },
      });

      this.logger.error(
        `Job ingest failed for JobSource ${jobSourceId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BadGatewayException(message, {
        cause: error,
      });
    }
  }

  /**
   * Sync every active job source sequentially (priority asc from config, then name).
   * Failures on one source do not abort the rest.
   */
  async syncAllActiveJobSources(): Promise<JobSourceBulkSyncResult> {
    const sources = await this.prisma.jobSource.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    });

    const sorted = [...sources].sort(
      (a, b) =>
        JobIngestOrchestrationService.readPriorityFromConfig(a.config) -
          JobIngestOrchestrationService.readPriorityFromConfig(b.config) ||
        a.name.localeCompare(b.name),
    );

    const results: JobSourceBulkSyncItemResult[] = [];

    for (const source of sorted) {
      try {
        const outcome = await this.syncExternalJobs(source.id);
        results.push({
          jobSourceId: source.id,
          name: source.name,
          ok: true,
          upsertedCount: outcome.upsertedCount,
          skippedInvalid: outcome.skippedInvalid,
          syncedAt: outcome.syncedAt,
        });
      } catch (error) {
        const errorMessage =
          JobIngestOrchestrationService.truncateErrorMessage(error);
        results.push({
          jobSourceId: source.id,
          name: source.name,
          ok: false,
          errorMessage,
        });
      }
    }

    const succeeded = results.filter((row) => row.ok).length;

    return {
      attempted: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  private static readPriorityFromConfig(config: unknown): number {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return 10;
    }
    const priority = (config as Record<string, unknown>).priority;
    return typeof priority === 'number' && Number.isFinite(priority)
      ? priority
      : 10;
  }

  private static truncateErrorMessage(error: unknown): string {
    const text = error instanceof Error ? error.message : 'Job ingest failed';
    const trimmed =
      typeof text === 'string' ? text.slice(0, MAX_HEALTH_MESSAGE) : 'unknown';
    return trimmed;
  }

  private static rawToJson(raw: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
  }
}
