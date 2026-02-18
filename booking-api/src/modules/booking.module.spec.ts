import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { BookingController } from './booking.module';
import {
  BookingEntity,
  BookingStatus,
  EventTypeEntity,
  ProviderEntity,
} from '../database/entities';

function makeController() {
  const bookingRepository = {
    findOne: jest.fn<Promise<BookingEntity | null>, []>(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const bookingEventRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };

  const discoveryRepository = {
    create: jest.fn((value) => ({ id: 'discovery-1', ...value })),
    save: jest.fn(async (value) => value),
  };

  const providerRepository = {
    findOne: jest.fn<Promise<ProviderEntity | null>, []>(),
  };

  const eventTypeRepository = {
    findOne: jest.fn<Promise<EventTypeEntity | null>, []>(),
  };

  const blackoutRepository = {
    findOne: jest.fn(),
  };

  const countiesService = {
    isCountyKnownInState: jest.fn(() => true),
  };

  const notificationService = {
    queueEmail: jest.fn(),
  };

  const bookingGateway = {
    emitBookingCreated: jest.fn(),
    emitBookingConfirmed: jest.fn(),
    emitBookingCancelled: jest.fn(),
    emitAvailabilityChanged: jest.fn(),
  };

  const bookingRepoInTx = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'booking-1',
      version: 0,
      ...value,
    })),
  };

  const bookingEventRepoInTx = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(async (_isolation, callback) =>
      callback({
        getRepository: (entity: unknown) =>
          entity === BookingEntity ? bookingRepoInTx : bookingEventRepoInTx,
      }),
    ),
  };

  const controller = new BookingController(
    dataSource as never,
    bookingRepository as never,
    bookingEventRepository as never,
    discoveryRepository as never,
    providerRepository as never,
    eventTypeRepository as never,
    blackoutRepository as never,
    countiesService as never,
    notificationService as never,
    bookingGateway as never,
  );

  return {
    controller,
    bookingRepository,
    discoveryRepository,
    providerRepository,
    eventTypeRepository,
    blackoutRepository,
    countiesService,
    notificationService,
    bookingGateway,
    dataSource,
  };
}

describe('BookingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid county/state pair for discovery booking', async () => {
    const { controller, countiesService } = makeController();
    countiesService.isCountyKnownInState.mockReturnValue(false);

    await expect(
      controller.createDiscoveryBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          endTs: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
          schoolName: 'School',
          city: 'Los Angeles',
          state: 'CA',
          county: 'Cook County',
          activeStudents: 120,
          instructorCount: 3,
        },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates pending booking when event type requires approval', async () => {
    const { controller, providerRepository, eventTypeRepository, blackoutRepository, notificationService } =
      makeController();

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    } as ProviderEntity);

    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: true,
    } as EventTypeEntity);

    blackoutRepository.findOne.mockResolvedValue(null);

    const result = await controller.createBooking(
      {
        providerId: 'provider-1',
        eventTypeId: 'event-type-1',
        startTs: start.toISOString(),
        endTs: end.toISOString(),
        customerName: 'Sensei',
        customerEmail: 'sensei@example.com',
      },
      { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
    );

    expect(result.status).toBe(BookingStatus.PENDING);
    expect(notificationService.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: 'booking-pending' }),
    );
  });

  it('blocks booking on blackout date', async () => {
    const { controller, providerRepository, eventTypeRepository, blackoutRepository } = makeController();

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);

    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: false,
    } as EventTypeEntity);

    blackoutRepository.findOne.mockResolvedValue({ date: start.toISOString().slice(0, 10) });

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('maps exclusion constraint overlap errors to slot_taken conflicts', async () => {
    const { controller, providerRepository, eventTypeRepository, blackoutRepository, dataSource } =
      makeController();

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);

    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: false,
    } as EventTypeEntity);

    blackoutRepository.findOne.mockResolvedValue(null);

    dataSource.transaction.mockRejectedValue(
      new QueryFailedError('INSERT INTO bookings ...', [], {
        code: '23P01',
      } as Error & { code: string }),
    );

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('throws not found when booking lookup misses', async () => {
    const { controller, bookingRepository } = makeController();
    bookingRepository.findOne.mockResolvedValue(null);

    await expect(
      controller.byId('missing', { headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns booking when id lookup succeeds', async () => {
    const { controller, bookingRepository } = makeController();
    bookingRepository.findOne.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      eventTypeId: 'event-type-1',
      customerName: 'Sensei',
      customerEmail: 'sensei@example.com',
      customerPhone: null,
      publicToken: 'token',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BookingEntity);

    await expect(
      controller.byId('booking-1', { headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).resolves.toEqual(expect.objectContaining({ id: 'booking-1' }));
  });

  it('confirms booking and emits websocket event', async () => {
    const { controller, bookingRepository, bookingGateway, notificationService } = makeController();

    bookingRepository.findOne.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerEmail: 'sensei@example.com',
      customerName: 'Sensei',
      customerPhone: null,
      eventTypeId: 'event-type-1',
      publicToken: 'public-token-1',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 60 * 1000),
      status: BookingStatus.PENDING,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BookingEntity);
    bookingRepository.save.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerEmail: 'sensei@example.com',
      customerName: 'Sensei',
      customerPhone: null,
      eventTypeId: 'event-type-1',
      publicToken: 'public-token-1',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BookingEntity);

    const result = await controller.confirm(
      'booking-1',
      { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
    );

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(notificationService.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: 'booking-confirmed' }),
    );
    expect(bookingGateway.emitBookingConfirmed).toHaveBeenCalled();
  });

  it('throws not found when confirming missing booking', async () => {
    const { controller, bookingRepository } = makeController();
    bookingRepository.findOne.mockResolvedValue(null);

    await expect(
      controller.confirm(
        'missing',
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns version conflict on stale cancellation version', async () => {
    const { controller, bookingRepository } = makeController();

    bookingRepository.findOne.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      customerEmail: 'sensei@example.com',
      customerName: 'Sensei',
      customerPhone: null,
      eventTypeId: 'event-type-1',
      publicToken: 'public-token-1',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BookingEntity);

    bookingRepository.createQueryBuilder.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
    });

    await expect(
      controller.cancel(
        'booking-1',
        { version: 1, reason: 'No longer needed' },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('cancels booking and emits events when version matches', async () => {
    const { controller, bookingRepository, bookingGateway, notificationService } = makeController();
    const existing = {
      id: 'booking-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      eventTypeId: 'event-type-1',
      customerName: 'Sensei',
      customerEmail: 'sensei@example.com',
      customerPhone: null,
      publicToken: 'token',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BookingEntity;
    bookingRepository.findOne.mockResolvedValue(existing);
    bookingRepository.createQueryBuilder.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        affected: 1,
        raw: [{ ...existing, status: BookingStatus.CANCELLED, version: 4 }],
      }),
    });

    const result = await controller.cancel(
      'booking-1',
      { version: 3, reason: 'Rescheduled' },
      { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
    );

    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(notificationService.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: 'booking-cancelled' }),
    );
    expect(bookingGateway.emitBookingCancelled).toHaveBeenCalled();
  });

  it('creates discovery booking and returns discovery id', async () => {
    const {
      controller,
      providerRepository,
      eventTypeRepository,
      blackoutRepository,
      countiesService,
      discoveryRepository,
    } = makeController();

    countiesService.isCountyKnownInState.mockReturnValue(true);
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);
    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: false,
    } as EventTypeEntity);
    blackoutRepository.findOne.mockResolvedValue(null);
    discoveryRepository.save.mockResolvedValue({ id: 'discovery-77' });

    const start = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const result = await controller.createDiscoveryBooking(
      {
        providerId: 'provider-1',
        eventTypeId: 'event-type-1',
        startTs: start.toISOString(),
        endTs: end.toISOString(),
        customerName: 'Sensei',
        customerEmail: 'sensei@example.com',
        schoolName: 'Dojo Prime',
        city: 'Los Angeles',
        state: 'CA',
        county: 'Los Angeles County',
        activeStudents: 240,
        instructorCount: 4,
      },
      { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
    );

    expect(result.booking.id).toBe('booking-1');
    expect(result.discoveryId).toBe('discovery-77');
  });

  it('surfaces provider and event type lookup failures', async () => {
    const { controller, providerRepository, eventTypeRepository } = makeController();
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    providerRepository.findOne.mockResolvedValue(null);
    await expect(
      controller.createBooking(
        {
          providerId: 'missing-provider',
          eventTypeId: 'event-type-1',
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(NotFoundException);

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);
    eventTypeRepository.findOne.mockResolvedValue(null);

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'missing-event',
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates booking windows and duration rules', async () => {
    const { controller, providerRepository, eventTypeRepository, blackoutRepository } = makeController();
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 2,
      maximumAdvanceDays: 1,
    } as ProviderEntity);
    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: false,
    } as EventTypeEntity);
    blackoutRepository.findOne.mockResolvedValue(null);

    const now = Date.now();
    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: 'invalid',
          endTs: 'invalid',
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
          endTs: new Date(now + 3 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: new Date(now + 30 * 60 * 1000).toISOString(),
          endTs: new Date(now + 60 * 60 * 1000).toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
          endTs: new Date(now + 4 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rethrows unknown transaction errors', async () => {
    const { controller, providerRepository, eventTypeRepository, blackoutRepository, dataSource } =
      makeController();
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);
    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      durationMinutes: 30,
      requiresApproval: false,
    } as EventTypeEntity);
    blackoutRepository.findOne.mockResolvedValue(null);
    dataSource.transaction.mockRejectedValue(new Error('unexpected'));

    await expect(
      controller.createBooking(
        {
          providerId: 'provider-1',
          eventTypeId: 'event-type-1',
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          customerName: 'Sensei',
          customerEmail: 'sensei@example.com',
        },
        { headers: { 'x-tenant-id': 'tenant-1' }, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toThrow('unexpected');
  });
});
