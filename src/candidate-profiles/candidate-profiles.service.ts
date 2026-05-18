import { Injectable } from '@nestjs/common';
import type { CandidateProfile, Resume } from '@prisma/client';
import { Prisma, ResumeParseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractCandidateProfileDraft,
  type CandidateProfileDraftJson,
} from './candidate-profile-heuristic.extractor';

const EMPTY_JSON_ARRAY = [] as unknown as Prisma.InputJsonValue;

@Injectable()
export class CandidateProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Builds structured rows after deterministic parsing (skipped when user confirmed profile). */
  async syncFromHeuristicParse(resume: Resume): Promise<void> {
    if (resume.status !== ResumeParseStatus.PARSED) {
      return;
    }

    const existing = await this.prisma.candidateProfile.findUnique({
      where: { resumeId: resume.id },
    });
    if (existing?.isConfirmed) {
      return;
    }

    const draft = extractCandidateProfileDraft(resume.parsedText ?? '');
    const payload = CandidateProfilesService.createPayload(
      resume.userId,
      resume.id,
      draft,
    );

    await this.prisma.candidateProfile.upsert({
      where: { resumeId: resume.id },
      create: payload,
      update: CandidateProfilesService.updatePayloadFromDraft(draft),
    });
  }

  async createFailureStub(
    userId: string,
    resumeId: string,
  ): Promise<CandidateProfile> {
    return this.prisma.candidateProfile.create({
      data: {
        userId,
        resumeId,
        skills: EMPTY_JSON_ARRAY,
        tools: EMPTY_JSON_ARRAY,
        roles: EMPTY_JSON_ARRAY,
        industries: EMPTY_JSON_ARRAY,
        locations: EMPTY_JSON_ARRAY,
        workModes: EMPTY_JSON_ARRAY,
        education: EMPTY_JSON_ARRAY,
        certifications: EMPTY_JSON_ARRAY,
        projects: EMPTY_JSON_ARRAY,
        experience: EMPTY_JSON_ARRAY,
        rawExtractedData: {
          stub: true,
          reason: 'parse_failed_or_manual_entry',
        },
        extractionPipeline: null,
      },
    });
  }

  private static createPayload(
    userId: string,
    resumeId: string,
    draft: CandidateProfileDraftJson,
  ): Prisma.CandidateProfileUncheckedCreateInput {
    return {
      userId,
      resumeId,
      headline: draft.headline,
      summary: draft.summary,
      skills: draft.skills as unknown as Prisma.InputJsonValue,
      tools: draft.tools as unknown as Prisma.InputJsonValue,
      roles: draft.roles as unknown as Prisma.InputJsonValue,
      industries: draft.industries as unknown as Prisma.InputJsonValue,
      yearsOfExperience: draft.yearsOfExperience,
      locations: draft.locations as unknown as Prisma.InputJsonValue,
      workModes: draft.workModes as unknown as Prisma.InputJsonValue,
      education: draft.education as unknown as Prisma.InputJsonValue,
      certifications: draft.certifications as unknown as Prisma.InputJsonValue,
      projects: draft.projects as unknown as Prisma.InputJsonValue,
      experience: draft.experience as unknown as Prisma.InputJsonValue,
      rawExtractedData:
        draft.rawExtractedData as unknown as Prisma.InputJsonValue,
      extractionPipeline: draft.extractionPipeline,
    };
  }

  private static updatePayloadFromDraft(
    draft: CandidateProfileDraftJson,
  ): Prisma.CandidateProfileUpdateInput {
    return {
      headline: draft.headline,
      summary: draft.summary,
      skills: draft.skills as unknown as Prisma.InputJsonValue,
      tools: draft.tools as unknown as Prisma.InputJsonValue,
      roles: draft.roles as unknown as Prisma.InputJsonValue,
      industries: draft.industries as unknown as Prisma.InputJsonValue,
      yearsOfExperience: draft.yearsOfExperience,
      locations: draft.locations as unknown as Prisma.InputJsonValue,
      workModes: draft.workModes as unknown as Prisma.InputJsonValue,
      education: draft.education as unknown as Prisma.InputJsonValue,
      certifications: draft.certifications as unknown as Prisma.InputJsonValue,
      projects: draft.projects as unknown as Prisma.InputJsonValue,
      experience: draft.experience as unknown as Prisma.InputJsonValue,
      rawExtractedData:
        draft.rawExtractedData as unknown as Prisma.InputJsonValue,
      extractionPipeline: draft.extractionPipeline,
    };
  }
}
