import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, type Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationsService } from './notifications.service';

const DELIVERY_WINDOW_MS = 15 * 60 * 1000;

export type DueNotificationRunResult = {
  enabled: boolean;
  remindersSent: number;
  interviewsSent: number;
};

@Injectable()
export class DueNotificationsWorkerService {
  private readonly logger = new Logger(DueNotificationsWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationPreferences: NotificationPreferenceService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async runDueChecks(now = new Date()): Promise<DueNotificationRunResult> {
    if (!this.isWorkerEnabled()) {
      this.logger.debug('Due notification worker skipped (disabled).');
      return {
        enabled: false,
        remindersSent: 0,
        interviewsSent: 0,
      };
    }

    const result: DueNotificationRunResult = {
      enabled: true,
      remindersSent: 0,
      interviewsSent: 0,
    };

    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    for (const user of users) {
      const categories = await this.notificationPreferences.getCategoriesForUser(
        user.id,
      );

      if (categories.reminders.enabled) {
        result.remindersSent += await this.processReminders(
          user,
          categories.reminders.leadMinutes,
          categories.reminders.channels,
          now,
        );
      }

      if (categories.interviews.enabled) {
        result.interviewsSent += await this.processInterviews(
          user,
          categories.interviews.leadMinutes,
          categories.interviews.channels,
          now,
        );
      }
    }

    if (result.remindersSent > 0 || result.interviewsSent > 0) {
      this.logger.log(
        `Due notification run complete: reminders=${result.remindersSent}, interviews=${result.interviewsSent}`,
      );
    }

    return result;
  }

  private async processReminders(
    user: { id: string; email: string; name: string },
    leadMinutes: number[],
    channels: { email: boolean; push: boolean; inApp: boolean },
    now: Date,
  ): Promise<number> {
    const maxLead = Math.max(...leadMinutes, 0);
    const horizon = new Date(now.getTime() + maxLead * 60_000 + DELIVERY_WINDOW_MS);

    const reminders = await this.prisma.reminder.findMany({
      where: {
        userId: user.id,
        isCompleted: false,
        dueDate: {
          gte: now,
          lte: horizon,
        },
      },
    });

    let sent = 0;
    for (const reminder of reminders) {
      for (const lead of leadMinutes) {
        if (!this.isWithinLeadWindow(reminder.dueDate, lead, now)) {
          continue;
        }

        const delivered = await this.deliverTimedNotification({
          user,
          sourceType: 'reminder',
          sourceId: reminder.id,
          leadMinutes: lead,
          channels,
          type: NotificationType.REMINDER_DUE,
          title: lead === 0 ? 'Reminder due now' : `Reminder due in ${this.formatLead(lead)}`,
          message: reminder.title,
          metadata: {
            reminderId: reminder.id,
            applicationId: reminder.applicationId,
            dueDate: reminder.dueDate.toISOString(),
            leadMinutes: lead,
          },
          emailSubject:
            lead === 0
              ? `Reminder due now: ${reminder.title}`
              : `Upcoming reminder (${this.formatLead(lead)}): ${reminder.title}`,
          emailBody: [
            `Hi ${user.name},`,
            '',
            `Reminder: ${reminder.title}`,
            reminder.description ? reminder.description : '',
            '',
            `Due: ${reminder.dueDate.toISOString()}`,
          ]
            .filter(Boolean)
            .join('\n'),
        });

        if (delivered) {
          sent += 1;
        }
      }
    }

    return sent;
  }

  private async processInterviews(
    user: { id: string; email: string; name: string },
    leadMinutes: number[],
    channels: { email: boolean; push: boolean; inApp: boolean },
    now: Date,
  ): Promise<number> {
    const maxLead = Math.max(...leadMinutes, 0);
    const horizon = new Date(now.getTime() + maxLead * 60_000 + DELIVERY_WINDOW_MS);

    const interviews = await this.prisma.interview.findMany({
      where: {
        userId: user.id,
        scheduledAt: {
          gte: now,
          lte: horizon,
        },
      },
    });

    let sent = 0;
    for (const interview of interviews) {
      for (const lead of leadMinutes) {
        if (!this.isWithinLeadWindow(interview.scheduledAt, lead, now)) {
          continue;
        }

        const delivered = await this.deliverTimedNotification({
          user,
          sourceType: 'interview',
          sourceId: interview.id,
          leadMinutes: lead,
          channels,
          type: NotificationType.INTERVIEW_UPCOMING,
          title:
            lead === 0
              ? 'Interview starting soon'
              : `Interview in ${this.formatLead(lead)}`,
          message: `${interview.stage.replace(/_/g, ' ')} · ${interview.interviewType.replace(/_/g, ' ')}`,
          metadata: {
            interviewId: interview.id,
            applicationId: interview.applicationId,
            scheduledAt: interview.scheduledAt.toISOString(),
            leadMinutes: lead,
          },
          emailSubject:
            lead === 0
              ? 'Interview starting soon'
              : `Upcoming interview (${this.formatLead(lead)})`,
          emailBody: [
            `Hi ${user.name},`,
            '',
            `You have an interview scheduled at ${interview.scheduledAt.toISOString()}.`,
            interview.location ? `Location: ${interview.location}` : '',
            interview.meetingLink ? `Link: ${interview.meetingLink}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        });

        if (delivered) {
          sent += 1;
        }
      }
    }

    return sent;
  }

  private isWithinLeadWindow(
    targetAt: Date,
    leadMinutes: number,
    now: Date,
  ): boolean {
    const notifyAt = targetAt.getTime() - leadMinutes * 60_000;
    const nowMs = now.getTime();
    return nowMs >= notifyAt && nowMs < notifyAt + DELIVERY_WINDOW_MS;
  }

  private async deliverTimedNotification(input: {
    user: { id: string; email: string; name: string };
    sourceType: string;
    sourceId: string;
    leadMinutes: number;
    channels: { email: boolean; push: boolean; inApp: boolean };
    type: NotificationType;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    emailSubject: string;
    emailBody: string;
  }): Promise<boolean> {
    let delivered = false;

    if (input.channels.inApp) {
      const alreadySent = await this.prisma.notificationDeliveryLog.findUnique({
        where: {
          userId_sourceType_sourceId_channel_leadMinutes: {
            userId: input.user.id,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            channel: 'in_app',
            leadMinutes: input.leadMinutes,
          },
        },
      });

      if (!alreadySent) {
        await this.notifications.create({
          userId: input.user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          metadata: input.metadata as Prisma.InputJsonValue,
        });
        await this.recordDelivery(
          input.user.id,
          input.sourceType,
          input.sourceId,
          'in_app',
          input.leadMinutes,
        );
        delivered = true;
      }
    }

    if (input.channels.email) {
      const alreadySent = await this.prisma.notificationDeliveryLog.findUnique({
        where: {
          userId_sourceType_sourceId_channel_leadMinutes: {
            userId: input.user.id,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            channel: 'email',
            leadMinutes: input.leadMinutes,
          },
        },
      });

      if (!alreadySent) {
        await this.emailService.sendNotificationEmail({
          to: input.user.email,
          subject: input.emailSubject,
          text: input.emailBody,
        });
        await this.recordDelivery(
          input.user.id,
          input.sourceType,
          input.sourceId,
          'email',
          input.leadMinutes,
        );
        delivered = true;
      }
    }

    return delivered;
  }

  private async recordDelivery(
    userId: string,
    sourceType: string,
    sourceId: string,
    channel: string,
    leadMinutes: number,
  ): Promise<void> {
    await this.prisma.notificationDeliveryLog.create({
      data: {
        userId,
        sourceType,
        sourceId,
        channel,
        leadMinutes,
      },
    });
  }

  private formatLead(minutes: number): string {
    if (minutes === 0) return 'now';
    if (minutes % 1440 === 0) {
      const days = minutes / 1440;
      return days === 1 ? '1 day' : `${days} days`;
    }
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  private isWorkerEnabled(): boolean {
    const raw = this.configService.get<string>('NOTIFICATION_WORKER_ENABLED');
    if (!raw?.trim()) {
      return false;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
}
