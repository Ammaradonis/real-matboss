import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Request } from 'express';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { calculateQualificationScore } from '../common/qualification-score';
import { resolveTenantId } from '../common/tenant-context';
import { UsCountiesService } from '../common/us-counties.service';
import {
  BookingEntity,
  BookingEventEntity,
  BookingStatus,
  DiscoveryCallEntity,
  EventTypeEntity,
  ProviderEntity,
} from '../database/entities';
import { NotificationService } from './notification.module';
import { BookingGateway } from './websocket.module';
import { NotificationModule } from './notification.module';
import { WebsocketModule } from './websocket.module';

class CreateBookingDto {
  @IsString()
  providerId!: string;

  @IsString()
  eventTypeId!: string;

  @IsDateString()
  startTs!: string;

  @IsDateString()
  endTs!: string;

  @IsString()
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

class CreateDiscoveryBookingDto extends CreateBookingDto {
  @IsString()
  schoolName!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  county!: string;

  @IsInt()
  @Min(1)
  activeStudents!: number;

  @IsInt()
  @Min(1)
  @Max(200)
  instructorCount!: number;

  @IsOptional()
  @IsString()
  currentSystem?: string;

  @IsOptional()
  @IsString()
  schedulingChallenges?: string;

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsString()
  implementationTimeline?: string;
}

class CancelBookingDto {
  @IsInt()
  version!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('bookings')
class BookingController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(BookingEventEntity)
    private readonly bookingEventRepository: Repository<BookingEventEntity>,
    @InjectRepository(DiscoveryCallEntity)
    private readonly discoveryRepository: Repository<DiscoveryCallEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepository: Repository<EventTypeEntity>,
    private readonly countiesService: UsCountiesService,
    private readonly notificationService: NotificationService,
    private readonly bookingGateway: BookingGateway,
  ) {}

  @Post()
  async createBooking(@Body() input: CreateBookingDto, @Req() req: Request): Promise<BookingEntity> {
    const tenantId = resolveTenantId(req);
    return this.createBookingTransaction(tenantId, input, req, false);
  }

  @Post('discovery')
  async createDiscoveryBooking(
    @Body() input: CreateDiscoveryBookingDto,
    @Req() req: Request,
  ): Promise<{ booking: BookingEntity; discoveryId: string }> {
    const tenantId = resolveTenantId(req);

    if (!this.countiesService.isCountyKnown(input.county)) {
      throw new ConflictException('Invalid county provided');
    }

    const booking = await this.createBookingTransaction(tenantId, input, req, true);

    const qualificationScore = calculateQualificationScore({
      activeStudents: input.activeStudents,
      budgetRange: input.budgetRange,
      implementationTimeline: input.implementationTimeline,
    });

    const discovery = await this.discoveryRepository.save(
      this.discoveryRepository.create({
        bookingId: booking.id,
        schoolName: input.schoolName,
        city: input.city,
        state: input.state,
        county: input.county,
        activeStudents: input.activeStudents,
        instructorCount: input.instructorCount,
        currentSystem: input.currentSystem ?? null,
        schedulingChallenges: input.schedulingChallenges ?? null,
        budgetRange: input.budgetRange ?? null,
        implementationTimeline: input.implementationTimeline ?? null,
        qualificationScore,
      }),
    );

    return { booking, discoveryId: discovery.id };
  }

  @Get(':id')
  async byId(@Param('id') id: string, @Req() req: Request): Promise<BookingEntity> {
    const tenantId = resolveTenantId(req);
    const booking = await this.bookingRepository.findOne({ where: { id, tenantId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  @UseGuards(AuthGuard)
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req: Request): Promise<BookingEntity> {
    const tenantId = resolveTenantId(req);
    const booking = await this.bookingRepository.findOne({ where: { id, tenantId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.status = BookingStatus.CONFIRMED;
    const saved = await this.bookingRepository.save(booking);

    await this.bookingEventRepository.save(
      this.bookingEventRepository.create({
        bookingId: saved.id,
        eventType: 'confirmed',
        newStartTs: saved.startTs,
        newEndTs: saved.endTs,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      }),
    );

    this.bookingGateway.emitBookingConfirmed(saved.providerId, saved);
    return saved;
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @Param('id') id: string,
    @Body() input: CancelBookingDto,
    @Req() req: Request,
  ): Promise<BookingEntity> {
    const tenantId = resolveTenantId(req);
    const booking = await this.bookingRepository.findOne({ where: { id, tenantId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updateResult = await this.bookingRepository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        status: BookingStatus.CANCELLED,
        version: () => 'version + 1',
      })
      .where('id = :id', { id })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: input.version })
      .returning('*')
      .execute();

    if ((updateResult.affected ?? 0) === 0) {
      throw new ConflictException('Booking version conflict');
    }

    const updated = updateResult.raw[0] as BookingEntity;

    await this.bookingEventRepository.save(
      this.bookingEventRepository.create({
        bookingId: updated.id,
        eventType: 'cancelled',
        oldStartTs: updated.startTs,
        oldEndTs: updated.endTs,
        reason: input.reason ?? null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      }),
    );

    this.bookingGateway.emitBookingCancelled(updated.providerId, updated);
    return updated;
  }

  private async createBookingTransaction(
    tenantId: string,
    input: CreateBookingDto,
    req: Request,
    createNotification: boolean,
  ): Promise<BookingEntity> {
    const provider = await this.providerRepository.findOne({
      where: { id: input.providerId, tenantId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const eventType = await this.eventTypeRepository.findOne({
      where: { id: input.eventTypeId, tenantId, providerId: provider.id },
    });
    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }

    try {
      const created = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const bookingRepo = manager.getRepository(BookingEntity);
        const eventRepo = manager.getRepository(BookingEventEntity);

        const entity = bookingRepo.create({
          tenantId,
          providerId: provider.id,
          eventTypeId: eventType.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone ?? null,
          startTs: new Date(input.startTs),
          endTs: new Date(input.endTs),
          status: BookingStatus.CONFIRMED,
        });

        const saved = await bookingRepo.save(entity);

        await eventRepo.save(
          eventRepo.create({
            bookingId: saved.id,
            eventType: 'created',
            newStartTs: saved.startTs,
            newEndTs: saved.endTs,
            ip: req.ip,
            userAgent: req.headers['user-agent'] ?? null,
          }),
        );

        return saved;
      });

      if (createNotification) {
        await this.notificationService.queueEmail({
          tenantId,
          bookingId: created.id,
          recipient: created.customerEmail,
          templateKey: 'discovery-confirmation',
          payload: {
            bookingId: created.id,
            startTs: created.startTs,
            endTs: created.endTs,
          },
        });
      }

      this.bookingGateway.emitBookingCreated(created.providerId, created);
      this.bookingGateway.emitAvailabilityChanged(created.providerId, {
        bookingId: created.id,
      });

      return created;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        (error.driverError as { code?: string }).code === '23P01'
      ) {
        throw new ConflictException({
          code: 'slot_taken',
          message: 'Slot no longer available; please choose another.',
        });
      }
      throw error;
    }
  }
}

@Module({
  imports: [
    NotificationModule,
    WebsocketModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingEventEntity,
      DiscoveryCallEntity,
      ProviderEntity,
      EventTypeEntity,
    ]),
  ],
  controllers: [BookingController],
  providers: [UsCountiesService],
})
export class BookingModule {}
