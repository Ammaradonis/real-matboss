import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import Handlebars from 'handlebars';
import { createEvent } from 'ics';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { resolveTenantId } from '../common/tenant-context';
import {
  BlackoutDateEntity,
  BookingEntity,
  EmailQueueEntity,
  EmailQueueStatus,
  EmailTemplateEntity,
} from '../database/entities';
import { NotificationService } from './notification.module';
import { NotificationModule } from './notification.module';

class CreateTemplateDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsArray()
  variables!: string[];
}

class QueueEmailDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

class PreviewTemplateDto {
  @IsString()
  htmlBody!: string;

  @IsOptional()
  variables?: Record<string, unknown>;
}

class BulkSendDto {
  @IsString()
  templateId!: string;

  @IsArray()
  bookingIds!: string[];
}

class TestSendDto {
  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;
}

class AddBlackoutDateDto {
  @IsString()
  providerId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('admin/email')
@UseGuards(AuthGuard)
class EmailController {
  constructor(
    @InjectRepository(EmailTemplateEntity)
    private readonly templateRepository: Repository<EmailTemplateEntity>,
    @InjectRepository(EmailQueueEntity)
    private readonly queueRepository: Repository<EmailQueueEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(BlackoutDateEntity)
    private readonly blackoutRepository: Repository<BlackoutDateEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('templates')
  async templates(@Req() req: Request): Promise<EmailTemplateEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.templateRepository.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  @Post('templates')
  async createTemplate(@Body() input: CreateTemplateDto, @Req() req: Request): Promise<EmailTemplateEntity> {
    const tenantId = resolveTenantId(req);

    const latest = await this.templateRepository.findOne({
      where: { tenantId, key: input.key },
      order: { version: 'DESC' },
    });

    return this.templateRepository.save(
      this.templateRepository.create({
        tenantId,
        key: input.key,
        name: input.name,
        category: input.category,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody ?? null,
        variables: input.variables,
        version: (latest?.version ?? 0) + 1,
      }),
    );
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() input: UpdateTemplateDto,
    @Req() req: Request,
  ): Promise<EmailTemplateEntity | null> {
    const tenantId = resolveTenantId(req);
    const template = await this.templateRepository.findOne({ where: { id, tenantId } });
    if (!template) {
      return null;
    }

    Object.assign(template, input);
    return this.templateRepository.save(template);
  }

  @Post('preview')
  async preview(@Body() input: PreviewTemplateDto): Promise<{ html: string }> {
    const renderer = Handlebars.compile(input.htmlBody);
    return { html: renderer(input.variables ?? {}) };
  }

  @Post('test-send')
  async testSend(@Body() input: TestSendDto): Promise<{ sent: true }> {
    await this.notificationService.sendEmailNow({
      to: input.to,
      subject: input.subject,
      html: input.htmlBody,
    });
    return { sent: true };
  }

  @Get('queue')
  async queue(@Req() req: Request): Promise<EmailQueueEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.queueRepository.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  @Post('queue')
  async enqueue(@Body() input: QueueEmailDto, @Req() req: Request): Promise<EmailQueueEntity> {
    const tenantId = resolveTenantId(req);
    return this.queueRepository.save(
      this.queueRepository.create({
        tenantId,
        bookingId: input.bookingId ?? null,
        templateId: input.templateId ?? null,
        to: input.to,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      }),
    );
  }

  @Post('bulk-send')
  async bulkSend(@Body() input: BulkSendDto, @Req() req: Request): Promise<{ queued: number }> {
    const tenantId = resolveTenantId(req);
    const template = await this.templateRepository.findOne({ where: { id: input.templateId, tenantId } });
    if (!template) {
      return { queued: 0 };
    }

    const bookings = await this.bookingRepository.find({
      where: input.bookingIds.map((id) => ({ id, tenantId })),
    });

    const rows = bookings.map((booking) =>
      this.queueRepository.create({
        tenantId,
        bookingId: booking.id,
        templateId: template.id,
        to: booking.customerEmail,
        subject: template.subject,
        htmlBody: Handlebars.compile(template.htmlBody)({ booking }),
        textBody: template.textBody,
      }),
    );

    if (rows.length) {
      await this.queueRepository.save(rows);
    }

    return { queued: rows.length };
  }

  @Post('blackout-dates')
  async addBlackout(
    @Body() input: AddBlackoutDateDto,
    @Req() req: Request,
  ): Promise<BlackoutDateEntity> {
    const tenantId = resolveTenantId(req);
    return this.blackoutRepository.save(
      this.blackoutRepository.create({
        tenantId,
        providerId: input.providerId,
        date: input.date.substring(0, 10),
        reason: input.reason ?? null,
      }),
    );
  }

  @Get('blackout-dates')
  async blackoutDates(@Req() req: Request): Promise<BlackoutDateEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.blackoutRepository.find({ where: { tenantId }, order: { date: 'ASC' } });
  }

  @Post('generate-ics/:bookingId')
  async generateIcs(@Param('bookingId') bookingId: string, @Req() req: Request): Promise<{ ics: string }> {
    const tenantId = resolveTenantId(req);
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      return { ics: '' };
    }

    const date = new Date(booking.startTs);
    const event = await new Promise<string>((resolve) => {
      createEvent(
        {
          title: 'MatBoss Discovery Call',
          description: 'Discovery call with MatBoss',
          start: [
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
          ],
          duration: { minutes: 30 },
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          organizer: { name: 'MatBoss', email: 'hello@matboss.online' },
        },
        (error, value) => {
          resolve(error ? '' : value ?? '');
        },
      );
    });

    return { ics: event };
  }
}

class EmailQueueProcessor {
  constructor(
    @InjectRepository(EmailQueueEntity)
    private readonly queueRepository: Repository<EmailQueueEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('*/30 * * * * *')
  async processQueue(): Promise<void> {
    const pending = await this.queueRepository
      .createQueryBuilder('q')
      .where('q.status = :status', { status: EmailQueueStatus.PENDING })
      .andWhere('q.scheduled_at <= NOW()')
      .andWhere('q.attempts < q.max_attempts')
      .orderBy('q.created_at', 'ASC')
      .limit(20)
      .getMany();

    for (const item of pending) {
      try {
        await this.notificationService.sendEmailNow({
          to: item.to,
          subject: item.subject,
          html: item.htmlBody,
          text: item.textBody ?? undefined,
        });
        item.status = EmailQueueStatus.SENT;
        item.sentAt = new Date();
      } catch (error) {
        item.attempts += 1;
        item.lastError = error instanceof Error ? error.message : String(error);
        if (item.attempts >= item.maxAttempts) {
          item.status = EmailQueueStatus.FAILED;
        }
      }

      await this.queueRepository.save(item);
    }
  }
}

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([
      EmailTemplateEntity,
      EmailQueueEntity,
      BookingEntity,
      BlackoutDateEntity,
    ]),
  ],
  controllers: [EmailController],
  providers: [EmailQueueProcessor],
  exports: [TypeOrmModule],
})
export class EmailModule {}
