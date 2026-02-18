import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';

const runDbTests = process.env.RUN_DB_TESTS === '1';

describe('Health and concurrency (e2e)', () => {
  if (!runDbTests) {
    it('requires RUN_DB_TESTS=1 to execute DB-backed e2e checks', () => {
      expect(runDbTests).toBe(false);
    });
    return;
  }

  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM discovery_calls');
    await dataSource.query('DELETE FROM booking_events');
    await dataSource.query('DELETE FROM bookings');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('prevents double-booking for parallel requests', async () => {
    const payload = {
      providerId: '44444444-4444-4444-4444-444444444444',
      eventTypeId: '55555555-5555-5555-5555-555555555551',
      startTs: '2026-03-03T16:00:00.000Z',
      endTs: '2026-03-03T16:30:00.000Z',
      customerName: 'Parallel Booker',
      customerEmail: 'parallel@example.com',
      customerPhone: '+12025550101',
    };

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('x-tenant-id', '11111111-1111-1111-1111-111111111111')
        .send(payload),
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('x-tenant-id', '11111111-1111-1111-1111-111111111111')
        .send(payload),
    ]);

    const sorted = [a.status, b.status].sort((left, right) => left - right);
    expect(sorted).toEqual([201, 409]);
  });
});
