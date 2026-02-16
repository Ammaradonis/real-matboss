import { Injectable, Logger, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { Repository } from 'typeorm';

import {
  NotificationChannel,
  NotificationEntity,
  NotificationStatus,
} from '../database/entities';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async queueEmail(input: {
    tenantId: string;
    bookingId?: string;
    recipient: string;
    templateKey: string;
    payload: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const record = this.notificationRepository.create({
      tenantId: input.tenantId,
      bookingId: input.bookingId ?? null,
      recipient: input.recipient,
      templateKey: input.templateKey,
      payload: input.payload,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.QUEUED,
    });
    return this.notificationRepository.save(record);
  }

  async sendEmailNow(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'MatBoss <no-reply@matboss.online>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async sendSmsPlaceholder(phone: string, message: string): Promise<void> {
    this.logger.log(`SMS placeholder -> ${phone}: ${message}`);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
