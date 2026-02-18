import { HealthController } from './health.module';

describe('HealthController', () => {
  const dataSource = {
    isInitialized: true,
    query: jest.fn(async () => [{ '?column?': 1 }]),
  };
  const controller = new HealthController(dataSource as never);

  it('returns liveness payload', () => {
    expect(controller.liveness()).toEqual({ status: 'ok', service: 'booking-api' });
  });

  it('returns readiness payload after DB ping', async () => {
    await expect(controller.readiness()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      mode: 'strict',
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns degraded readiness when probe fails but datasource is initialized', async () => {
    dataSource.query.mockRejectedValueOnce(new Error('connection reset'));
    await expect(controller.readiness()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      mode: 'degraded',
    });
  });

  it('throws when datasource is not initialized', async () => {
    dataSource.isInitialized = false;
    await expect(controller.readiness()).rejects.toThrow(
      'Database connection not initialized',
    );
    dataSource.isInitialized = true;
  });
});
