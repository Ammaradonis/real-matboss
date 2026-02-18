import { EventTypeController } from './event-type.module';
import { EventTypeKind } from '../database/entities';

describe('EventTypeController', () => {
  const eventTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'event-type-1', ...value })),
  };

  const controller = new EventTypeController(eventTypeRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates event types with configurable color', async () => {
    const response = await controller.create(
      {
        providerId: 'provider-1',
        name: 'Discovery Call',
        slug: 'discovery-30',
        kind: EventTypeKind.ONE_ON_ONE,
        durationMinutes: 30,
        color: '#008080',
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response.color).toBe('#008080');
    expect(response.tenantId).toBe('tenant-1');
  });

  it('patches existing event type', async () => {
    eventTypeRepository.findOne.mockResolvedValue({
      id: 'event-type-1',
      tenantId: 'tenant-1',
      name: 'Old',
      durationMinutes: 30,
    });

    const response = await controller.patch(
      'event-type-1',
      { name: 'New Name', priceCents: 1500, maxAttendees: 5 },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response).toEqual(expect.objectContaining({ name: 'New Name', priceCents: 1500 }));
  });

  it('returns null when patch target is missing', async () => {
    eventTypeRepository.findOne.mockResolvedValue(null);
    await expect(
      controller.patch(
        'missing',
        { name: 'Nope' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toBeNull();
  });

  it('lists event types and resolves slug', async () => {
    eventTypeRepository.find.mockResolvedValue([{ id: 'event-type-1' }]);
    eventTypeRepository.findOne.mockResolvedValue({ id: 'event-type-1', slug: 'discovery-30' });

    await expect(
      controller.listForProvider(
        'provider-1',
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toEqual([{ id: 'event-type-1' }]);
    await expect(
      controller.bySlug(
        'provider-1',
        'discovery-30',
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toEqual({ id: 'event-type-1', slug: 'discovery-30' });
  });
});
