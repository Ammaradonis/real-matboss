import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';
import { NotificationService } from './notification.module';
import { BookingGateway } from './websocket.module';

const runDbTests = process.env.RUN_DB_TESTS === '1';

(runDbTests ? describe : describe.skip)('Booking integration flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query(`DELETE FROM discovery_calls`);
    await dataSource.query(`DELETE FROM booking_events`);
    await dataSource.query(`DELETE FROM bookings`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates discovery booking and dispatches integrations', async () => {
    const notificationService = app.get(NotificationService);
    const gateway = app.get(BookingGateway);

    const queueSpy = jest.spyOn(notificationService, 'queueEmail');
    const createdSpy = jest.spyOn(gateway, 'emitBookingCreated');
    const changedSpy = jest.spyOn(gateway, 'emitAvailabilityChanged');

    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings/discovery')
      .set('x-tenant-id', '11111111-1111-1111-1111-111111111111')
      .send({
        providerId: '44444444-4444-4444-4444-444444444444',
        eventTypeId: '55555555-5555-5555-5555-555555555551',
        startTs: '2026-03-02T16:00:00.000Z',
        endTs: '2026-03-02T16:30:00.000Z',
        customerName: 'Sensei Mora',
        customerEmail: 'sensei@example.com',
        customerPhone: '+12025550100',
        schoolName: 'Dojo Prime',
        city: 'Los Angeles',
        state: 'CA',
        county: 'Los Angeles County',
        activeStudents: 220,
        instructorCount: 5,
        currentSystem: 'Mindbody',
        schedulingChallenges: 'Late follow-ups',
        budgetRange: '$2,500 - $5,000',
        implementationTimeline: 'within 60 days',
      })
      .expect(201);

    expect(response.body.booking.id).toBeDefined();
    expect(response.body.discoveryId).toBeDefined();

    expect(queueSpy).toHaveBeenCalled();
    expect(createdSpy).toHaveBeenCalled();
    expect(changedSpy).toHaveBeenCalled();
  });
});
