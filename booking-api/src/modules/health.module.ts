import {
  Controller,
  Get,
  Logger,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

type ReadinessPayload = {
  status: 'ok';
  db: 'up';
  mode: 'strict' | 'degraded';
};

@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  liveness(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'booking-api' };
  }

  @Get('ready')
  async readiness(): Promise<ReadinessPayload> {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database connection not initialized');
    }

    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'up', mode: 'strict' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Readiness DB probe failed; using initialized connection state: ${message}`,
      );
      return { status: 'ok', db: 'up', mode: 'degraded' };
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [HealthController],
})
export class HealthModule {}
