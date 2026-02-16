import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminModule } from './modules/admin.module';
import { AuthModule } from './modules/auth.module';
import { AvailabilityModule } from './modules/availability.module';
import { BookingModule } from './modules/booking.module';
import { EmailModule } from './modules/email.module';
import { EventTypeModule } from './modules/event-type.module';
import { HealthModule } from './modules/health.module';
import { NotificationModule } from './modules/notification.module';
import { ProviderModule } from './modules/provider.module';
import { WebsocketModule } from './modules/websocket.module';
import { ENTITIES } from './database/entities';
import { SanitizeInterceptor } from './shared/sanitize.interceptor';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:946732@localhost:5432/matboss',
      autoLoadEntities: true,
      entities: ENTITIES,
      synchronize: false,
      logging: false,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    AvailabilityModule,
    BookingModule,
    ProviderModule,
    EventTypeModule,
    AdminModule,
    EmailModule,
    NotificationModule,
    WebsocketModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
  ],
})
export class AppModule {}
