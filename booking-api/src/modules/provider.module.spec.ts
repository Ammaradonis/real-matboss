import { ProviderController } from './provider.module';

describe('ProviderController', () => {
  const providerRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'provider-1', ...value })),
    delete: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(),
  };

  const controller = new ProviderController(providerRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves public provider URL by tenant slug + booking URL', async () => {
    providerRepository.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'provider-1', bookingUrl: 'ammar-vienna' }),
    });

    const response = await controller.byUrl('matboss-demo', 'ammar-vienna');
    expect(response.provider).toEqual(expect.objectContaining({ id: 'provider-1' }));
  });

  it('lists and fetches provider by id', async () => {
    providerRepository.find.mockResolvedValue([{ id: 'provider-1' }]);
    providerRepository.findOne.mockResolvedValue({ id: 'provider-1' });

    await expect(
      controller.list({ headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).resolves.toEqual([{ id: 'provider-1' }]);
    await expect(
      controller.byId('provider-1', { headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).resolves.toEqual({ id: 'provider-1' });
  });

  it('creates provider with tenant-scoped defaults', async () => {
    const response = await controller.create(
      {
        name: 'Ammar',
        bookingUrl: 'ammar-vienna',
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response.timeZone).toBe('America/Los_Angeles');
    expect(response.tenantId).toBe('tenant-1');
  });

  it('returns delete status', async () => {
    const response = await controller.remove(
      'provider-1',
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(response).toEqual({ deleted: true });
  });

  it('updates provider settings when provider exists', async () => {
    providerRepository.findOne.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      minimumNoticeHours: 24,
      maximumAdvanceDays: 60,
    });

    const response = await controller.updateSettings(
      'provider-1',
      {
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 20,
        minimumNoticeHours: 12,
        maximumAdvanceDays: 90,
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response).toEqual(
      expect.objectContaining({
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 20,
        minimumNoticeHours: 12,
        maximumAdvanceDays: 90,
      }),
    );
  });

  it('returns null on patch when provider missing', async () => {
    providerRepository.findOne.mockResolvedValue(null);
    await expect(
      controller.patch(
        'provider-404',
        { name: 'Nope' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toBeNull();
  });

  it('returns null when settings target is missing', async () => {
    providerRepository.findOne.mockResolvedValue(null);
    await expect(
      controller.updateSettings(
        'provider-404',
        {
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 10,
          minimumNoticeHours: 10,
          maximumAdvanceDays: 10,
        },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toBeNull();
  });
});
