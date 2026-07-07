import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildInactiveExternalJobPurgeWhere } from './quality/build-inactive-external-job-purge-where';
import {
  buildDuplicateContentHashSet,
  evaluateExternalJobQuality,
} from './quality/external-job-quality.rules';
import {
  EXTERNAL_JOB_INACTIVE_RETENTION_DAYS,
  isExternalJobPurgeEnabled,
} from './quality/job-quality.constants';

const UPDATE_CHUNK = 100;

export type ExternalJobQualityScanResult = {
  scannedCount: number;
  suspiciousCount: number;
  clearedCount: number;
  flaggedByReason: Record<string, number>;
  durationMs: number;
};

export type ExternalJobInactivePurgeResult = {
  dryRun: boolean;
  enabled: boolean;
  retentionDays: number;
  cutoff: string;
  matchedCount: number;
  deletedCount: number;
  durationMs: number;
};

@Injectable()
export class ExternalJobQualityService {
  private readonly logger = new Logger(ExternalJobQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Recompute quality flags for all active external jobs (Phase J.1). */
  async runQualityScan(): Promise<ExternalJobQualityScanResult> {
    const startedAt = Date.now();
    const rows = await this.prisma.externalJob.findMany({
      where: { isActive: true },
      select: {
        id: true,
        applicationUrl: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        contentHash: true,
      },
    });

    const duplicateHashes = buildDuplicateContentHashSet(rows);
    const flaggedByReason: Record<string, number> = {};
    let suspiciousCount = 0;
    let clearedCount = 0;

    for (let i = 0; i < rows.length; i += UPDATE_CHUNK) {
      const chunk = rows.slice(i, i + UPDATE_CHUNK);
      await this.prisma.$transaction(
        chunk.map((row) => {
          const flags = evaluateExternalJobQuality(row, duplicateHashes);
          const isSuspicious = flags.length > 0;
          if (isSuspicious) {
            suspiciousCount++;
          } else {
            clearedCount++;
          }
          for (const flag of flags) {
            flaggedByReason[flag] = (flaggedByReason[flag] ?? 0) + 1;
          }

          return this.prisma.externalJob.update({
            where: { id: row.id },
            data: {
              isSuspicious,
              qualityFlags:
                flags.length > 0
                  ? (flags as Prisma.InputJsonValue)
                  : Prisma.DbNull,
            },
          });
        }),
      );
    }

    const durationMs = Date.now() - startedAt;
    const result: ExternalJobQualityScanResult = {
      scannedCount: rows.length,
      suspiciousCount,
      clearedCount,
      flaggedByReason,
      durationMs,
    };

    this.logger.log(
      JSON.stringify({
        event: 'external_job_quality_scan_complete',
        ...result,
      }),
    );

    return result;
  }

  /** Delete inactive external jobs older than retention cutoff when enabled (Phase J.4). */
  async purgeInactiveExternalJobs(options?: {
    dryRun?: boolean;
    retentionDays?: number;
  }): Promise<ExternalJobInactivePurgeResult> {
    const startedAt = Date.now();
    const enabled = isExternalJobPurgeEnabled();
    const retentionDays =
      options?.retentionDays ?? EXTERNAL_JOB_INACTIVE_RETENTION_DAYS;
    const dryRun = options?.dryRun ?? false;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

    const where = buildInactiveExternalJobPurgeWhere(cutoff);
    const matchedCount = await this.prisma.externalJob.count({ where });

    if (!enabled) {
      return {
        dryRun: true,
        enabled: false,
        retentionDays,
        cutoff: cutoff.toISOString(),
        matchedCount,
        deletedCount: 0,
        durationMs: Date.now() - startedAt,
      };
    }

    if (dryRun) {
      return {
        dryRun: true,
        enabled: true,
        retentionDays,
        cutoff: cutoff.toISOString(),
        matchedCount,
        deletedCount: 0,
        durationMs: Date.now() - startedAt,
      };
    }

    const deleted = await this.prisma.externalJob.deleteMany({ where });
    const durationMs = Date.now() - startedAt;

    this.logger.log(
      JSON.stringify({
        event: 'external_job_inactive_purge_complete',
        retentionDays,
        cutoff: cutoff.toISOString(),
        matchedCount,
        deletedCount: deleted.count,
        durationMs,
      }),
    );

    return {
      dryRun: false,
      enabled: true,
      retentionDays,
      cutoff: cutoff.toISOString(),
      matchedCount,
      deletedCount: deleted.count,
      durationMs,
    };
  }

  assertPurgeEnabledOrDryRun(dryRun: boolean): void {
    if (!isExternalJobPurgeEnabled() && !dryRun) {
      throw new BadRequestException(
        'Inactive job purge is disabled. Set EXTERNAL_JOB_PURGE_ENABLED=true or use dryRun=true.',
      );
    }
  }
}
