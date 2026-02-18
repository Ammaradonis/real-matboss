import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  addDays,
  addHours,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { SlotDto } from '../common/types';
import { resolveTenantId } from '../common/tenant-context';
import {
  AvailabilityOverrideEntity,
  AvailabilityRuleEntity,
  BlackoutDateEntity,
  BookingEntity,
  BookingStatus,
  EventTypeEntity,
  OverrideKind,
  ProviderEntity,
} from '../database/entities';

class CreateRuleDto {
  @IsString()
  providerId!: string;

  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsString()
  timeZone!: string;
}

class CreateOverrideDto {
  @IsString()
  providerId!: string;

  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsDateString()
  startTs!: string;

  @IsDateString()
  endTs!: string;

  @IsEnum(OverrideKind)
  kind!: OverrideKind;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('providers/:providerId/availability')
export class AvailabilityController {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(AvailabilityRuleEntity)
    private readonly ruleRepository: Repository<AvailabilityRuleEntity>,
    @InjectRepository(AvailabilityOverrideEntity)
    private readonly overrideRepository: Repository<AvailabilityOverrideEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepository: Repository<EventTypeEntity>,
    @InjectRepository(BlackoutDateEntity)
    private readonly blackoutRepository: Repository<BlackoutDateEntity>,
  ) {}

  @Get()
  async getSlots(
    @Param('providerId', new ParseUUIDPipe()) providerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('viewerTz') viewerTz = 'UTC',
    @Req() req: Request,
    @Query('eventTypeId') eventTypeId?: string,
  ): Promise<{ slots: SlotDto[] }> {
    const tenantId = resolveTenantId(req);
    const provider = await this.providerRepository.findOne({ where: { id: providerId, tenantId } });
    if (!provider) {
      return { slots: [] };
    }

    const fromUtc = parseISO(from);
    const toUtc = parseISO(to);
    if (Number.isNaN(fromUtc.getTime()) || Number.isNaN(toUtc.getTime()) || toUtc <= fromUtc) {
      return { slots: [] };
    }

    const selectedEventType = eventTypeId
      ? await this.eventTypeRepository.findOne({
          where: { id: eventTypeId, tenantId, providerId, isActive: true },
        })
      : null;
    if (eventTypeId && !selectedEventType) {
      return { slots: [] };
    }

    const slotDurationMinutes = selectedEventType?.durationMinutes ?? 30;
    const minimumNoticeAt = addHours(new Date(), provider.minimumNoticeHours);
    const maximumAdvanceAt = addDays(new Date(), provider.maximumAdvanceDays);

    const rules = await this.ruleRepository.find({ where: { tenantId, providerId } });
    const overrides = await this.overrideRepository
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.provider_id = :providerId', { providerId })
      .andWhere('o.start_ts < :toUtc', { toUtc: toUtc.toISOString() })
      .andWhere('o.end_ts > :fromUtc', { fromUtc: fromUtc.toISOString() })
      .getMany();
    const blackoutFrom = format(toZonedTime(fromUtc, provider.timeZone), 'yyyy-MM-dd');
    const blackoutTo = format(toZonedTime(toUtc, provider.timeZone), 'yyyy-MM-dd');
    const blackouts = await this.blackoutRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.provider_id = :providerId', { providerId })
      .andWhere('b.date >= :blackoutFrom', { blackoutFrom })
      .andWhere('b.date <= :blackoutTo', { blackoutTo })
      .getMany();
    const blackoutDates = new Set(blackouts.map((blackout) => blackout.date));

    const bookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.provider_id = :providerId', { providerId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere('b.start_ts < :toUtc', { toUtc: toUtc.toISOString() })
      .andWhere('b.end_ts > :fromUtc', { fromUtc: fromUtc.toISOString() })
      .getMany();

    const raw: SlotDto[] = [];
    const localStartDate = startOfDay(toZonedTime(fromUtc, provider.timeZone));
    const localEndDate = startOfDay(toZonedTime(toUtc, provider.timeZone));

    for (
      let inProviderTz = localStartDate;
      !isAfter(inProviderTz, localEndDate);
      inProviderTz = addDays(inProviderTz, 1)
    ) {
      const dow = inProviderTz.getDay();
      const datePart = format(inProviderTz, 'yyyy-MM-dd');
      if (blackoutDates.has(datePart)) {
        continue;
      }

      const dayRules = rules.filter(
        (rule) =>
          rule.dayOfWeek === dow &&
          (!eventTypeId || rule.eventTypeId === null || rule.eventTypeId === eventTypeId),
      );

      for (const rule of dayRules) {
        const blockStart = fromZonedTime(`${datePart}T${rule.startTime}`, rule.timeZone);
        const blockEnd = fromZonedTime(`${datePart}T${rule.endTime}`, rule.timeZone);

        for (
          let slotStart = blockStart;
          isBefore(slotStart, blockEnd);
          slotStart = addMinutes(slotStart, slotDurationMinutes)
        ) {
          const slotEnd = addMinutes(slotStart, slotDurationMinutes);
          if (isAfter(slotEnd, toUtc) || isBefore(slotStart, fromUtc)) {
            continue;
          }
          if (slotStart < minimumNoticeAt || slotStart > maximumAdvanceAt) {
            continue;
          }

          const bufferedStart = addMinutes(slotStart, -provider.bufferBeforeMinutes);
          const bufferedEnd = addMinutes(slotEnd, provider.bufferAfterMinutes);

          const hasBookingConflict = bookings.some(
            (booking) => bufferedStart < booking.endTs && bufferedEnd > booking.startTs,
          );

          if (hasBookingConflict) {
            continue;
          }

          const relevantOverrides = overrides.filter(
            (override) =>
              slotStart < override.endTs &&
              slotEnd > override.startTs &&
              (!eventTypeId || override.eventTypeId === null || override.eventTypeId === eventTypeId),
          );
          if (relevantOverrides.some((override) => override.kind === OverrideKind.BLOCKED)) {
            continue;
          }

          raw.push({
            startUtc: slotStart.toISOString(),
            endUtc: slotEnd.toISOString(),
            startViewer: toZonedTime(slotStart, viewerTz).toISOString(),
            endViewer: toZonedTime(slotEnd, viewerTz).toISOString(),
          });
        }
      }
    }

    for (const override of overrides.filter(
      (item) =>
        item.kind === OverrideKind.AVAILABLE &&
        (!eventTypeId || item.eventTypeId === null || item.eventTypeId === eventTypeId),
    )) {
      if (override.startTs < minimumNoticeAt || override.startTs > maximumAdvanceAt) {
        continue;
      }
      raw.push({
        startUtc: override.startTs.toISOString(),
        endUtc: override.endTs.toISOString(),
        startViewer: toZonedTime(override.startTs, viewerTz).toISOString(),
        endViewer: toZonedTime(override.endTs, viewerTz).toISOString(),
      });
    }

    const unique = Array.from(new Map(raw.map((slot) => [slot.startUtc, slot])).values()).sort((a, b) =>
      a.startUtc.localeCompare(b.startUtc),
    );

    return { slots: unique };
  }

  @UseGuards(AuthGuard)
  @Post('/rules')
  async createRule(@Body() input: CreateRuleDto, @Req() req: Request): Promise<AvailabilityRuleEntity> {
    const tenantId = resolveTenantId(req);
    return this.ruleRepository.save(this.ruleRepository.create({ tenantId, ...input }));
  }

  @UseGuards(AuthGuard)
  @Post('/overrides')
  async createOverride(
    @Body() input: CreateOverrideDto,
    @Req() req: Request,
  ): Promise<AvailabilityOverrideEntity> {
    const tenantId = resolveTenantId(req);
    return this.overrideRepository.save(
      this.overrideRepository.create({
        tenantId,
        providerId: input.providerId,
        eventTypeId: input.eventTypeId ?? null,
        startTs: new Date(input.startTs),
        endTs: new Date(input.endTs),
        kind: input.kind,
        reason: input.reason ?? null,
      }),
    );
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderEntity,
      AvailabilityRuleEntity,
      AvailabilityOverrideEntity,
      BookingEntity,
      EventTypeEntity,
      BlackoutDateEntity,
    ]),
  ],
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
