import { Injectable, Logger } from '@nestjs/common';
import type { CurrentUser } from '../common/types/current-user.type';

/**
 * V2E.E4 placeholder: real channels (email, push, digest) plug in here.
 * Workers / cron should call preview + enqueue methods once alert rules exist.
 */
@Injectable()
export class MatchAlertDeliveryService {
  private readonly logger = new Logger(MatchAlertDeliveryService.name);

  /**
   * No-op stub: log intent for observability (E.5) until SMTP/push is wired.
   */
  previewDigestForUser(_user: CurrentUser): { wouldSend: boolean; reason: string } {
    return {
      wouldSend: false,
      reason: 'Match alert delivery is not configured (V2E.E4 stub).',
    };
  }

  logFeedFailure(source: string, err: unknown): void {
    this.logger.warn(
      `External job feed concern [${source}]: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
