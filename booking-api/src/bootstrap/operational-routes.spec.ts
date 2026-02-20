import express from 'express';
import request from 'supertest';

import { registerOperationalRoutes } from './operational-routes';

describe('registerOperationalRoutes', () => {
  it('serves root service index instead of 404', async () => {
    const app = express();
    registerOperationalRoutes(app, { includeDocsLink: true });

    const response = await request(app).get('/').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'booking-api',
      routes: {
        liveness: '/api/v1/health',
        readiness: '/api/v1/health/ready',
        railwayProbe: '/api/v1/healthz',
        docs: '/api/docs',
      },
    });
  });

  it('serves railway probe endpoint', async () => {
    const app = express();
    registerOperationalRoutes(app, { includeDocsLink: false });

    await request(app)
      .get('/api/v1/healthz')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: 'ok',
          service: 'booking-api',
          probe: 'railway',
        });
      });
  });
});

