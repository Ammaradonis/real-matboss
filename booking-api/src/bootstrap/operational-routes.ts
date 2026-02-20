import { Request, Response } from 'express';
import type { Express } from 'express';

type OperationalRouteOptions = {
  includeDocsLink: boolean;
};

export function registerOperationalRoutes(
  expressApp: Express,
  options: OperationalRouteOptions,
): void {
  expressApp.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'booking-api',
      message: 'MatBoss Booking API is running.',
      routes: {
        liveness: '/api/v1/health',
        readiness: '/api/v1/health/ready',
        railwayProbe: '/api/v1/healthz',
        docs: options.includeDocsLink ? '/api/docs' : null,
      },
    });
  });

  // Railway health endpoint: bypass Nest guards/interceptors/DB checks and always return 200.
  expressApp.get('/api/v1/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'booking-api', probe: 'railway' });
  });
}

