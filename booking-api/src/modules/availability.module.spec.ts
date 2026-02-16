import { AvailabilityController } from './availability.module';
import {
  AvailabilityOverrideEntity,
  AvailabilityRuleEntity,
  BookingEntity,
  BookingStatus,
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
    );

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'America/Los_Angeles',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    } as ProviderEntity);

    ruleRepository.find.mockResolvedValue([
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        timeZone: 'America/Los_Angeles',
      } as AvailabilityRuleEntity,
    ]);

    overrideRepository.createQueryBuilder.mockReturnValue(buildQueryBuilder<AvailabilityOverrideEntity>([]));

    bookingRepository.createQueryBuilder.mockReturnValue(
      buildQueryBuilder<BookingEntity>([
        {
          status: BookingStatus.CONFIRMED,
          startTs: new Date('2026-02-02T17:30:00.000Z'),
          endTs: new Date('2026-02-02T18:00:00.000Z'),
        } as BookingEntity,
      ]),
    );

    const result = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      '2026-02-02T16:00:00.000Z',
      '2026-02-02T20:00:00.000Z',
      'Europe/Vienna',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(result.slots.length).toBe(1);
    expect(result.slots[0].startUtc).toBe('2026-02-02T17:00:00.000Z');
  });

  it('handles DST boundary ranges without throwing', async () => {
    const controller = new AvailabilityController(
      providerRepository as never,
      ruleRepository as never,
      overrideRepository as never,
      bookingRepository as never,
    );

    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      timeZone: 'America/Los_Angeles',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
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

    const result = await controller.getSlots(
      '00000000-0000-0000-0000-000000000001',
      '2026-11-01T07:00:00.000Z',
      '2026-11-01T12:00:00.000Z',
      'America/New_York',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(Array.isArray(result.slots)).toBe(true);
  });
});
