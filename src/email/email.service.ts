import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
  }): Promise<void> {
    const subject = 'Reset your JobTrackr password';
    const text = [
      'You requested a password reset for your JobTrackr account.',
      '',
      `Reset your password: ${input.resetUrl}`,
      '',
      'This link expires in 1 hour. If you did not request this, you can ignore this email.',
    ].join('\n');

    const html = `
      <p>You requested a password reset for your JobTrackr account.</p>
      <p><a href="${input.resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `.trim();

    await this.sendEmail({
      to: input.to,
      subject,
      text,
      html,
    });
  }

  private async sendEmail(input: SendEmailInput): Promise<void> {
    const smtpHost = this.configService.get<string>('SMTP_HOST')?.trim();
    if (!smtpHost) {
      this.logger.warn(
        `[email:dev] To: ${input.to} | Subject: ${input.subject}\n${input.text}`,
      );
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM')?.trim() ?? 'JobTrackr <noreply@jobtrackr.app>',
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST')!.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }
}
