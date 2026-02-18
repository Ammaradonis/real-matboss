import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { SanitizeInterceptor } from './shared/sanitize.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  // Railway health endpoint: bypass Nest guards/interceptors/DB checks and always return 200.
  expressApp.get('/api/v1/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'booking-api', probe: 'railway' });
  });

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(compression());

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new SanitizeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MatBoss Booking API')
      .setDescription('MatBoss multi-tenant booking backend')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const rawPort = process.env.PORT ?? '3000';
  const parsedPort = Number.parseInt(rawPort.replace(/^\"|\"$/g, ''), 10);
  const port = Number.isFinite(parsedPort) ? parsedPort : 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`booking-api listening on 0.0.0.0:${port}`);
}

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', error);
  process.exit(1);
});
