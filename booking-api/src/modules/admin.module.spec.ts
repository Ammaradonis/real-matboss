import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { AdminController } from './admin.module';
import { UserRole } from '../database/entities';

function makeChain<T>(result: T) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(typeof result === 'number' ? result : 0),
    getMany: jest.fn().mockResolvedValue(Array.isArray(result) ? result : []),
    getRawMany: jest.fn().mockResolvedValue(result),
  };
}

function buildController() {
  const userRepository = {
    findOne: jest.fn(),
  };

  const discoveryRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const bookingRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const settingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const emailQueueRepository = {
    createQueryBuilder: jest.fn(),
  };

  const controller = new AdminController(
    userRepository as never,
    discoveryRepository as never,
    bookingRepository as never,
    settingRepository as never,
    emailQueueRepository as never,
  );

  return {
    controller,
    userRepository,
    discoveryRepository,
    bookingRepository,
    settingRepository,
    emailQueueRepository,
  };
}

describe('AdminController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid admin logins', async () => {
    const { controller, userRepository } = buildController();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      controller.adminLogin(
        { email: 'admin@example.com', password: 'wrong' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('issues token for valid admin login', async () => {
    const { controller, userRepository } = buildController();
    const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      passwordHash: '$2b$10$abc',
    });

    const response = await controller.adminLogin(
      { email: 'admin@example.com', password: 'correct' },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response.accessToken.length).toBeGreaterThan(0);
    expect(compareSpy).toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('returns expanded analytics payload', async () => {
    const { controller, bookingRepository, discoveryRepository, emailQueueRepository } = buildController();

    bookingRepository.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(4);

    bookingRepository.createQueryBuilder
      .mockReturnValueOnce(makeChain(3))
      .mockReturnValueOnce(makeChain(10))
      .mockReturnValueOnce(makeChain(8))
      .mockReturnValueOnce(
        makeChain([
          { weekStart: '2026-02-03', count: '4' },
          { weekStart: '2026-02-10', count: '5' },
        ]),
      );

    discoveryRepository.createQueryBuilder
      .mockReturnValueOnce(makeChain([{ status: 'new', count: '7' }]))
      .mockReturnValueOnce(makeChain([{ state: 'CA', count: '5' }]))
      .mockReturnValueOnce(makeChain([{ label: '$2,500 - $5,000', count: '6' }]))
      .mockReturnValueOnce(makeChain([{ label: 'within 60 days', count: '4' }]))
      .mockReturnValueOnce(makeChain([{ label: 'Mindbody', count: '2' }]));

    emailQueueRepository.createQueryBuilder.mockReturnValue(
      makeChain([
        { status: 'SENT', count: '11' },
        { status: 'FAILED', count: '1' },
      ]),
    );

    const response = await controller.analytics({
      headers: { 'x-tenant-id': 'tenant-1' },
    } as never);

    expect(response.totalBookings).toBe(20);
    expect(response.conversionRate).toBe(60);
    expect(response.monthComparison).toEqual({
      thisMonth: 10,
      lastMonth: 8,
      deltaPercent: 25,
    });
    expect(response.leadFunnel).toEqual([{ status: 'new', count: '7' }]);
    expect(response.weeklyTrend).toHaveLength(2);
    expect(response.emailStats).toEqual({ sent: 11, failed: 1 });
  });

  it('creates and updates admin settings', async () => {
    const { controller, settingRepository } = buildController();
    settingRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'setting-1',
      tenantId: 'tenant-1',
      key: 'discovery.bufferMinutes',
      value: 15,
    });

    const created = await controller.upsertSetting(
      { key: 'discovery.bufferMinutes', value: { minutes: 15 } },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(created.value).toEqual({ minutes: 15 });

    const updated = await controller.upsertSetting(
      { key: 'discovery.bufferMinutes', value: { minutes: 30 } },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(updated.value).toEqual({ minutes: 30 });
  });

  it('returns false when lead status target is missing', async () => {
    const { controller, discoveryRepository } = buildController();
    discoveryRepository.findOne.mockResolvedValue(null);

    await expect(
      controller.updateLeadStatus({
        discoveryId: 'missing',
        leadStatus: 'qualified' as never,
      }),
    ).resolves.toEqual({ updated: false });
  });

  it('exports discovery rows as CSV', async () => {
    const { controller, discoveryRepository } = buildController();
    discoveryRepository.createQueryBuilder.mockReturnValue(
      makeChain([
        {
          bookingId: 'booking-1',
          schoolName: 'School',
          city: 'Los Angeles',
          state: 'CA',
          county: 'Los Angeles County',
          activeStudents: 100,
          instructorCount: 3,
          budgetRange: '$2,500 - $5,000',
          implementationTimeline: 'within 60 days',
          leadStatus: 'new',
          qualificationScore: 70,
          followUpAt: null,
          adminNotes: null,
        },
      ]),
    );

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await controller.csvExport(
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      res as never,
    );

    expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/csv');
    expect(res.send).toHaveBeenCalled();
  });

  it('lists discovery calls and updates follow-up', async () => {
    const { controller, discoveryRepository } = buildController();

    discoveryRepository.createQueryBuilder.mockReturnValue(
      makeChain([{ id: 'discovery-1', schoolName: 'Dojo' }]),
    );
    discoveryRepository.findOne.mockResolvedValue({
      id: 'discovery-1',
      adminNotes: null,
    });

    await expect(
      controller.discoveryList(
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
        'dojo',
        undefined,
      ),
    ).resolves.toEqual([{ id: 'discovery-1', schoolName: 'Dojo' }]);
    await expect(
      controller.discoveryList(
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
        undefined,
        'qualified' as never,
      ),
    ).resolves.toEqual([{ id: 'discovery-1', schoolName: 'Dojo' }]);

    await expect(
      controller.setFollowUp({
        discoveryId: 'discovery-1',
        followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        note: 'Call tomorrow',
      }),
    ).resolves.toEqual({ updated: true });
    expect(discoveryRepository.save).toHaveBeenCalled();
  });
});
