import { HealthController } from './health.module';

describe('HealthController', () => {
  const dataSource = {
    query: jest.fn(async () => [{ '?column?': 1 }]),
  };

  const controller = new HealthController(dataSource as never);

  it('returns liveness payload', () => {
    expect(controller.liveness()).toEqual({ status: 'ok', service: 'booking-api' });
  });

  it('returns readiness payload after DB ping', async () => {
    await expect(controller.readiness()).resolves.toEqual({ status: 'ok', db: 'up' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
