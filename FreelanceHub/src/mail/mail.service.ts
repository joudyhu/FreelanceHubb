import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, text: string) {
    const host = this.config.get<string>('MAIL_HOST');
    if (!host) {
      this.logger.warn(`Mail not sent: SMTP is not configured (to=${to}, subject=${subject})`);
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('MAIL_PORT', 587)),
      secure: Number(this.config.get('MAIL_PORT', 587)) === 465,
      auth: this.config.get('MAIL_USER') ? {
        user: this.config.get('MAIL_USER'), pass: this.config.get('MAIL_PASS'),
      } : undefined,
    });
    await transporter.sendMail({
      from: this.config.get('MAIL_FROM', 'FreelanceHub <no-reply@localhost>'),
      to, subject, text,
    });
    return { sent: true };
  }
}
