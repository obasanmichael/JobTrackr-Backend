import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ApplicationEventsService } from '../application-events/application-events.service';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationResponseDto } from '../applications/dto/application-response.dto';
import type {
  ApplicationSource,
  ApplicationStatus,
  WorkMode,
} from '../applications/dto/application.enums';
import type { CurrentUser } from '../common/types/current-user.type';
import type {
  InterviewStage,
  InterviewType,
} from '../interviews/dto/interview.enums';
import { InterviewsService } from '../interviews/interviews.service';

/** Forward-progress order; terminal statuses are never auto-advanced from. */
const STATUS_RANK: Record<ApplicationStatus, number> = {
  SAVED: 0,
  APPLIED: 1,
  SCREENING: 2,
  INTERVIEW: 3,
  TECHNICAL_ASSESSMENT: 4,
  FINAL_INTERVIEW: 5,
  OFFER: 6,
  REJECTED: -1,
  WITHDRAWN: -1,
};

const STAGE_TO_STATUS: Record<InterviewStage, ApplicationStatus | null> = {
  RECRUITER_SCREEN: 'SCREENING',
  TECHNICAL_INTERVIEW: 'INTERVIEW',
  TECHNICAL_ASSESSMENT: 'TECHNICAL_ASSESSMENT',
  HIRING_MANAGER: 'INTERVIEW',
  FINAL_INTERVIEW: 'FINAL_INTERVIEW',
  OFFER_DISCUSSION: null,
  OTHER: 'INTERVIEW',
};

const MAX_RESULTS = 50;

export type LogApplicationInput = {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  workMode?: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  source?: ApplicationSource;
  notes?: string;
};

export type ScheduleInterviewInput = {
  applicationId: string;
  stage: InterviewStage;
  interviewType: InterviewType;
  scheduledAt: Date;
  location?: string;
  meetingLink?: string;
  notes?: string;
};

/**
 * Business logic behind the MCP tools. Everything goes through the existing
 * domain services, so ownership checks stay in one place.
 */
@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);

  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly applicationEventsService: ApplicationEventsService,
    private readonly interviewsService: InterviewsService,
  ) {}

  async logApplication(currentUser: CurrentUser, input: LogApplicationInput) {
    if (
      input.salaryMin !== undefined &&
      input.salaryMax !== undefined &&
      input.salaryMax < input.salaryMin
    ) {
      throw new BadRequestException(
        'salaryMax must be greater than or equal to salaryMin.',
      );
    }

    const existing = await this.applicationsService.findByCompanyAndTitle(
      currentUser,
      input.companyName,
      input.jobTitle,
    );

    if (!existing) {
      const created = await this.applicationsService.create(currentUser, {
        ...input,
        currency: input.currency?.toUpperCase(),
        status: 'APPLIED',
      });
      await this.applicationEventsService.createForApplication(
        currentUser,
        created.id,
        { type: 'GENERAL_UPDATE', title: 'Applied' },
      );
      return {
        action: 'created' as const,
        application: this.summarize(created),
      };
    }

    // Never overwrite what is already recorded: fill gaps, advance SAVED -> APPLIED,
    // and keep new notes as a timeline entry instead of replacing `notes`.
    // Salary and currency are filled together, and only when nothing is recorded.
    const fillSalary = existing.salaryMin == null && existing.salaryMax == null;
    const updated = await this.applicationsService.update(
      currentUser,
      existing.id,
      {
        jobUrl: existing.jobUrl ? undefined : input.jobUrl,
        location: existing.location ? undefined : input.location,
        workMode:
          existing.workMode !== 'UNSPECIFIED' ? undefined : input.workMode,
        salaryMin: fillSalary ? input.salaryMin : undefined,
        salaryMax: fillSalary ? input.salaryMax : undefined,
        currency: existing.currency ? undefined : input.currency?.toUpperCase(),
        source: existing.source !== 'OTHER' ? undefined : input.source,
        status: existing.status === 'SAVED' ? 'APPLIED' : undefined,
      },
    );
    if (input.notes) {
      await this.applicationEventsService.createForApplication(
        currentUser,
        existing.id,
        { type: 'NOTE', title: 'Application note', description: input.notes },
      );
    }
    return { action: 'updated' as const, application: this.summarize(updated) };
  }

  async updateStatus(
    currentUser: CurrentUser,
    applicationId: string,
    status: ApplicationStatus,
    note?: string,
  ) {
    const updated = await this.applicationsService.update(
      currentUser,
      applicationId,
      { status },
    );
    if (note) {
      await this.applicationEventsService.createForApplication(
        currentUser,
        applicationId,
        { type: 'NOTE', title: 'Status note', description: note },
      );
    }
    return this.summarize(updated);
  }

  async addNote(
    currentUser: CurrentUser,
    applicationId: string,
    type: 'NOTE' | 'RECRUITER_UPDATE' | 'GENERAL_UPDATE',
    title: string,
    description?: string,
  ) {
    const event = await this.applicationEventsService.createForApplication(
      currentUser,
      applicationId,
      { type, title, description },
    );
    return { id: event.id, type: event.type, title: event.title };
  }

  async scheduleInterview(
    currentUser: CurrentUser,
    input: ScheduleInterviewInput,
  ) {
    // Ownership check first, so nothing is written for an unknown application.
    const application = await this.applicationsService.findOne(
      currentUser,
      input.applicationId,
    );

    // Retrying the same call (e.g. after a timeout) must not duplicate the interview.
    const existing = await this.interviewsService.findExisting(
      currentUser,
      input.applicationId,
      input.stage,
      input.scheduledAt,
    );
    const interview =
      existing ?? (await this.interviewsService.create(currentUser, input));

    // The interview is saved at this point; the follow-ups are best-effort so a
    // failure here cannot make Claude retry and double-book.
    let current = application;
    try {
      const target = STAGE_TO_STATUS[input.stage];
      if (
        target &&
        STATUS_RANK[application.status] >= 0 &&
        STATUS_RANK[target] > STATUS_RANK[application.status]
      ) {
        current = await this.applicationsService.update(
          currentUser,
          input.applicationId,
          { status: target },
        );
      }
      if (!existing) {
        await this.applicationEventsService.createForApplication(
          currentUser,
          input.applicationId,
          {
            type: 'INTERVIEW_UPDATE',
            title: `Interview scheduled: ${this.humanize(input.stage)}`,
            description: input.notes,
          },
        );
      }
    } catch (error) {
      this.logger.warn(
        `Interview ${interview.id} saved but follow-up steps failed: ${String(error)}`,
      );
    }

    return {
      action: existing ? ('existing' as const) : ('created' as const),
      interview: {
        id: interview.id,
        stage: interview.stage,
        interviewType: interview.interviewType,
        scheduledAt: interview.scheduledAt,
        location: interview.location ?? null,
        meetingLink: interview.meetingLink ?? null,
      },
      application: this.summarize(current),
    };
  }

  async findApplications(
    currentUser: CurrentUser,
    search?: string,
    status?: ApplicationStatus,
  ) {
    const applications = await this.applicationsService.findAll(currentUser, {
      search,
      status,
    });
    return {
      total: applications.length,
      applications: applications
        .slice(0, MAX_RESULTS)
        .map((application) => this.summarize(application)),
    };
  }

  async listUpcomingInterviews(currentUser: CurrentUser) {
    const interviews = await this.interviewsService.findUpcoming(currentUser);
    const applications = await this.applicationsService.findByIds(currentUser, [
      ...new Set(interviews.map((interview) => interview.applicationId)),
    ]);
    const byId = new Map(applications.map((a) => [a.id, a]));

    return {
      interviews: interviews.slice(0, MAX_RESULTS).map((interview) => ({
        id: interview.id,
        applicationId: interview.applicationId,
        companyName: byId.get(interview.applicationId)?.companyName ?? null,
        jobTitle: byId.get(interview.applicationId)?.jobTitle ?? null,
        stage: interview.stage,
        interviewType: interview.interviewType,
        scheduledAt: interview.scheduledAt,
        location: interview.location ?? null,
        meetingLink: interview.meetingLink ?? null,
      })),
    };
  }

  private summarize(application: ApplicationResponseDto) {
    return {
      id: application.id,
      companyName: application.companyName,
      jobTitle: application.jobTitle,
      status: application.status,
      source: application.source,
      jobUrl: application.jobUrl ?? null,
      location: application.location ?? null,
      deadline: application.deadline ?? null,
      createdAt: application.createdAt,
    };
  }

  private humanize(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
}
