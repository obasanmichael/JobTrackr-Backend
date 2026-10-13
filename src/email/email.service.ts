import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  renderNotificationEmail,
  renderPasswordResetEmail,
} from './email.templates';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const DEFAULT_FROM = 'JobTrackr <onboarding@resend.dev>';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
  }): Promise<void> {
    const ttlHours = Number(
      this.configService.get<string>('PASSWORD_RESET_TTL_HOURS') ?? '1',
    );
    const email = renderPasswordResetEmail({
      resetUrl: input.resetUrl,
      expiresInHours: ttlHours,
    });

    await this.sendEmail({ to: input.to, ...email });
  }

  async sendNotificationEmail(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const { html } = renderNotificationEmail(input);

    await this.sendEmail({ ...input, html });
  }

  private async sendEmail(input: SendEmailInput): Promise<void> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.warn(
        `[email:dev] To: ${input.to} | Subject: ${input.subject}\n${input.text}`,
      );
      return;
    }

    this.client ??= new Resend(apiKey);

    // Resend reports failures in the response instead of throwing.
    const { error } = await this.client.emails.send({
      from:
        this.configService.get<string>('EMAIL_FROM')?.trim() || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (error) {
      this.logger.error(
        `Resend rejected email to ${input.to}: ${error.name} - ${error.message}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }
}
