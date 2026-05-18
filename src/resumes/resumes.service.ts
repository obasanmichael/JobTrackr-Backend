import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { CandidateProfile, Resume } from '@prisma/client';
import { Prisma, ResumeParseStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeLocalStorageService } from '../storage/resume-local.storage';
import type { CurrentUser } from '../common/types/current-user.type';
import { CandidateProfileResponseDto } from './dto/candidate-profile-response.dto';
import { ResumeResponseDto } from './dto/resume-response.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumeDocumentParserService } from './resume-document-parser.service';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ALLOWED_RESUME_MIMES = new Set<string>([PDF_MIME, DOCX_MIME]);

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ResumeLocalStorageService,
    private readonly documentParser: ResumeDocumentParserService,
  ) {}

  async listForUser(user: CurrentUser): Promise<ResumeResponseDto[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'asc' },
    });
    return resumes.map((resume) => ResumesService.toDto(resume));
  }

  async findOne(user: CurrentUser, resumeId: string): Promise<ResumeResponseDto> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    return ResumesService.toDto(resume);
  }

  async updateResume(
    user: CurrentUser,
    resumeId: string,
    dto: UpdateResumeDto,
  ): Promise<ResumeResponseDto> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (dto.isActive === true) {
      await this.prisma.$transaction([
        this.prisma.resume.updateMany({
          where: { userId: user.userId },
          data: { isActive: false },
        }),
        this.prisma.resume.update({
          where: { id: resumeId },
          data: { isActive: true },
        }),
      ]);
    } else if (dto.isActive === false) {
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { isActive: false },
      });
    }

    const next = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!next) {
      throw new NotFoundException('Resume not found');
    }
    return ResumesService.toDto(next);
  }

  async getOrCreateProfile(
    user: CurrentUser,
    resumeId: string,
  ): Promise<CandidateProfileResponseDto> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (
      resume.status !== ResumeParseStatus.PARSED &&
      resume.status !== ResumeParseStatus.FAILED
    ) {
      throw new NotFoundException(
        'Candidate profile is available after parsing finishes. You can still view this resume from the list.',
      );
    }

    const existing = await this.prisma.candidateProfile.findUnique({
      where: { resumeId },
    });
    if (existing) {
      return ResumesService.profileToDto(existing);
    }

    const created = await this.prisma.candidateProfile.create({
      data: {
        userId: user.userId,
        resumeId,
        skills: [],
        tools: [],
        roles: [],
        industries: [],
        locations: [],
        workModes: [],
        education: [],
        certifications: [],
        projects: [],
        experience: [],
      },
    });
    return ResumesService.profileToDto(created);
  }

  async updateProfile(
    user: CurrentUser,
    resumeId: string,
    dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponseDto> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: user.userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (
      resume.status !== ResumeParseStatus.PARSED &&
      resume.status !== ResumeParseStatus.FAILED
    ) {
      throw new BadRequestException(
        'You can edit the candidate profile after parsing completes or when parsing has failed.',
      );
    }

    await this.getOrCreateProfile(user, resumeId);

    const data: Prisma.CandidateProfileUpdateInput = {};
    if (dto.headline !== undefined) data.headline = dto.headline;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.skills !== undefined) {
      data.skills = dto.skills as Prisma.InputJsonValue;
    }
    if (dto.tools !== undefined) {
      data.tools = dto.tools as Prisma.InputJsonValue;
    }
    if (dto.roles !== undefined) {
      data.roles = dto.roles as Prisma.InputJsonValue;
    }
    if (dto.industries !== undefined) {
      data.industries = dto.industries as Prisma.InputJsonValue;
    }
    if (dto.yearsOfExperience !== undefined) {
      data.yearsOfExperience = dto.yearsOfExperience;
    }
    if (dto.locations !== undefined) {
      data.locations = dto.locations as Prisma.InputJsonValue;
    }
    if (dto.workModes !== undefined) {
      data.workModes = dto.workModes as Prisma.InputJsonValue;
    }
    if (dto.education !== undefined) {
      data.education = dto.education as Prisma.InputJsonValue;
    }
    if (dto.certifications !== undefined) {
      data.certifications = dto.certifications as Prisma.InputJsonValue;
    }
    if (dto.projects !== undefined) {
      data.projects = dto.projects as Prisma.InputJsonValue;
    }
    if (dto.experience !== undefined) {
      data.experience = dto.experience as Prisma.InputJsonValue;
    }
    if (dto.isConfirmed !== undefined) data.isConfirmed = dto.isConfirmed;

    const updated = await this.prisma.candidateProfile.update({
      where: { resumeId },
      data,
    });
    return ResumesService.profileToDto(updated);
  }

  async uploadAndParse(
    user: CurrentUser,
    file: Express.Multer.File | undefined,
  ): Promise<ResumeResponseDto> {
    ResumesService.assertFilePresent(file);
    const upload = file;
    ResumesService.assertAllowedResumeMime(upload.mimetype);

    const id = randomUUID();
    const ext = ResumesService.suffixFromMime(upload.mimetype);
    const storageKey = path.posix.join(user.userId, id, `document${ext}`);
    const safeFileName = ResumesService.sanitizeFileName(upload.originalname);

    const resume = await this.prisma.resume.create({
      data: {
        id,
        userId: user.userId,
        fileName: safeFileName,
        fileType: upload.mimetype,
        fileSize: upload.size,
        storageKey,
        status: ResumeParseStatus.UPLOADED,
      },
    });

    try {
      await this.storage.save(storageKey, upload.buffer);
    } catch {
      await this.prisma.resume.delete({ where: { id: resume.id } });
      throw new InternalServerErrorException('Could not persist resume upload');
    }

    await this.runParsingLifecycle(resume.id);

    const updated = await this.prisma.resume.findUnique({
      where: { id: resume.id },
    });
    if (!updated) {
      throw new InternalServerErrorException('Resume not found after parse');
    }
    return ResumesService.toDto(updated);
  }

  async runParsingLifecycle(resumeId: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });
    if (!resume) {
      return;
    }

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        status: ResumeParseStatus.PARSING,
        parseError: null,
      },
    });

    try {
      const binary = await this.storage.read(resume.storageKey);
      const text = await this.documentParser.extractText(
        binary,
        resume.fileType,
      );
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: ResumeParseStatus.PARSED,
          parsedText: text,
          parseError: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not extract resume text';
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: ResumeParseStatus.FAILED,
          parseError: message,
        },
      });
    }
  }

  static toDto(resume: Resume): ResumeResponseDto {
    return {
      id: resume.id,
      userId: resume.userId,
      fileName: resume.fileName,
      fileType: resume.fileType,
      fileSize: resume.fileSize,
      fileUrl: resume.fileUrl,
      storageKey: resume.storageKey,
      status: resume.status,
      parsedText: resume.parsedText,
      parseError: resume.parseError,
      isActive: resume.isActive,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  static profileToDto(profile: CandidateProfile): CandidateProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      resumeId: profile.resumeId,
      headline: profile.headline,
      summary: profile.summary,
      skills: ResumesService.jsonField(profile.skills),
      tools: ResumesService.jsonField(profile.tools),
      roles: ResumesService.jsonField(profile.roles),
      industries: ResumesService.jsonField(profile.industries),
      yearsOfExperience: profile.yearsOfExperience,
      locations: ResumesService.jsonField(profile.locations),
      workModes: ResumesService.jsonField(profile.workModes),
      education: ResumesService.jsonField(profile.education),
      certifications: ResumesService.jsonField(profile.certifications),
      projects: ResumesService.jsonField(profile.projects),
      experience: ResumesService.jsonField(profile.experience),
      isConfirmed: profile.isConfirmed,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private static jsonField(
    value: Prisma.JsonValue | null,
  ): unknown[] | Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }
    return value as unknown[] | Record<string, unknown>;
  }

  private static assertFilePresent(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file?.buffer || !file.size) {
      throw new BadRequestException('A non-empty resume file is required');
    }
  }

  private static assertAllowedResumeMime(mimeType: string): void {
    if (!ALLOWED_RESUME_MIMES.has(mimeType)) {
      throw new BadRequestException(
        'Only PDF and DOCX resume uploads are supported',
      );
    }
  }

  private static suffixFromMime(mimeType: string): string {
    if (mimeType === PDF_MIME) {
      return '.pdf';
    }
    if (mimeType === DOCX_MIME) {
      return '.docx';
    }
    return '';
  }

  private static sanitizeFileName(original: string): string {
    const base = path.basename(original).replace(/[\u0000-\u001F]/g, '');
    const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
    return cleaned.length > 0 ? cleaned.slice(0, 255) : 'resume';
  }
}
