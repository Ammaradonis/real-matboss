import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { registerOperationalRoutes } from './bootstrap/operational-routes';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { SanitizeInterceptor } from './shared/sanitize.interceptor';

function toWildcardRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll('\\*', '.*')}$`, 'i');
}

function isLikelyLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  registerOperationalRoutes(expressApp, {
    includeDocsLink: process.env.NODE_ENV !== 'production',
  });

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(compression());

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowRailwayApps =
    !process.env.CORS_ALLOW_RAILWAY_APPS ||
    /^(1|true|yes)$/i.test(process.env.CORS_ALLOW_RAILWAY_APPS);
  const wildcardOrigins = corsOrigins.filter((origin) => origin.includes('*'));
  const exactOrigins = corsOrigins.filter((origin) => !origin.includes('*'));
  const wildcardRegexes = wildcardOrigins.map((origin) => toWildcardRegex(origin));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (exactOrigins.includes('*') || exactOrigins.some((allowed) => allowed === origin)) {
        callback(null, true);
        return;
      }

      if (wildcardRegexes.some((regex) => regex.test(origin))) {
        callback(null, true);
        return;
      }

      if (isLikelyLocalOrigin(origin)) {
        callback(null, true);
        return;
      }

      if (allowRailwayApps && /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/i.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
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
