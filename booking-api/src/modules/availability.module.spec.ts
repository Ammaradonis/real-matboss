import { AvailabilityController } from './availability.module';
import {
  AvailabilityOverrideEntity,
  AvailabilityRuleEntity,
  BlackoutDateEntity,
  BookingEntity,
  BookingStatus,
  EventTypeEntity,
  ProviderEntity,
} from '../database/entities';

describe('AvailabilityController', () => {
  const providerRepository = {
    findOne: jest.fn<Promise<ProviderEntity | null>, []>(),
  };

  const ruleRepository = {
    find: jest.fn<Promise<AvailabilityRuleEntity[]>, []>(),
  };

  const overrideRepository = {
    createQueryBuilder: jest.fn(),
  };

  const bookingRepository = {
    createQueryBuilder: jest.fn(),
  };

  const eventTypeRepository = {
    findOne: jest.fn<Promise<EventTypeEntity | null>, []>(),
  };

  const blackoutRepository = {
    createQueryBuilder: jest.fn(),
  };

  const buildQueryBuilder = <T>(rows: T[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates timezone-aware slots and removes conflicts', async () => {
    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
      eventTypeRepository as never,
      blackoutRepository as never,
    );

    const slotDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    slotDate.setUTCHours(9, 0, 0, 0);
    const from = new Date(slotDate);
    from.setUTCHours(8, 0, 0, 0);
    const to = new Date(slotDate);
    to.setUTCHours(11, 0, 0, 0);
    const weekday = slotDate.getUTCDay();

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);

    ruleRepository.find.mockResolvedValue([
      {
        dayOfWeek: weekday,
        startTime: '09:00',
        endTime: '10:00',
        timeZone: 'UTC',
      } as AvailabilityRuleEntity,
    ]);

    overrideRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<AvailabilityOverrideEntity>([]));
    blackoutRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<BlackoutDateEntity>([]));

    bookingRepository.createQueryBuilder.mockReturnValue(
      buildQueryBuilder<BookingEntity>([
        {
          status: BookingStatus.CONFIRMED,
          startTs: new Date(slotDate.getTime() + 30 * 60 * 1000),
          endTs: new Date(slotDate.getTime() + 60 * 60 * 1000),
        } as BookingEntity,
      ]),
    );

    const result = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      from.toISOString(),
      to.toISOString(),
      'Europe/Vienna',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      undefined,
    );

    expect(result.slots.length).toBe(1);
    expect(result.slots[0].startUtc).toBe(slotDate.toISOString());
  });

  it('handles DST boundary ranges without throwing', async () => {
    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
      eventTypeRepository as never,
      blackoutRepository as never,
    );

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'America/Los_Angeles',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);

    ruleRepository.find.mockResolvedValue([
      {
        dayOfWeek: 0,
        startTime: '01:00',
        endTime: '03:00',
        timeZone: 'America/Los_Angeles',
      } as AvailabilityRuleEntity,
    ]);

    overrideRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<AvailabilityOverrideEntity>([]));
    bookingRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<BookingEntity>([]));
    blackoutRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<BlackoutDateEntity>([]));

    const result = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      '2026-11-01T07:00:00.000Z',
      '2026-11-01T12:00:00.000Z',
      'America/New_York',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      undefined,
    );

    expect(Array.isArray(result.slots)).toBe(true);
  });

  it('filters out slots on blackout dates', async () => {
    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
      eventTypeRepository as never,
      blackoutRepository as never,
    );

    const slotDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    slotDate.setUTCHours(9, 0, 0, 0);
    const weekday = slotDate.getUTCDay();

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);

    ruleRepository.find.mockResolvedValue([
      {
        dayOfWeek: weekday,
        startTime: '09:00',
        endTime: '10:00',
        timeZone: 'UTC',
      } as AvailabilityRuleEntity,
    ]);

    overrideRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<AvailabilityOverrideEntity>([]));
    bookingRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<BookingEntity>([]));
    blackoutRepository.createQueryBuilder.mockReturnValue(
      buildQueryBuilder<BlackoutDateEntity>([
        { date: slotDate.toISOString().slice(0, 10) } as BlackoutDateEntity,
      ]),
    );

    const from = new Date(slotDate);
    from.setUTCHours(8, 0, 0, 0);
    const to = new Date(slotDate);
    to.setUTCHours(11, 0, 0, 0);

    const result = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      from.toISOString(),
      to.toISOString(),
      'UTC',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      undefined,
    );

    expect(result.slots).toEqual([]);
  });

  it('returns empty list for invalid ranges or unknown event type', async () => {
    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
      eventTypeRepository as never,
      blackoutRepository as never,
    );

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'UTC',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      maximumAdvanceDays: 365,
    } as ProviderEntity);
    eventTypeRepository.findOne.mockResolvedValue(null);

    const invalidRange = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      'not-a-date',
      '2026-11-01T12:00:00.000Z',
      'UTC',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      undefined,
    );
    expect(invalidRange.slots).toEqual([]);

    const missingEventType = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      'UTC',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      'missing-event',
    );
    expect(missingEventType.slots).toEqual([]);
  });

  it('creates availability rules and overrides', async () => {
    const ruleSave = jest.fn(async (value) => value);
    const overrideSave = jest.fn(async (value) => value);
    (ruleRepository as unknown as { save: (...args: unknown[]) => Promise<unknown> }).save = ruleSave;
    (ruleRepository as unknown as { create: (...args: unknown[]) => unknown }).create = (value) => value;
    (overrideRepository as unknown as { save: (...args: unknown[]) => Promise<unknown> }).save =
      overrideSave;
    (overrideRepository as unknown as { create: (...args: unknown[]) => unknown }).create = (value) =>
      value;

    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
      eventTypeRepository as never,
      blackoutRepository as never,
    );

    const rule = await controller.createRule(
      {
        providerId: 'provider-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        timeZone: 'UTC',
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(rule).toEqual(expect.objectContaining({ tenantId: 'tenant-1' }));

    const override = await controller.createOverride(
      {
        providerId: 'provider-1',
        startTs: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTs: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        kind: 'BLOCKED' as never,
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(override).toEqual(expect.objectContaining({ tenantId: 'tenant-1' }));
  });
});
