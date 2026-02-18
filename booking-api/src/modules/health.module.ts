import { Controller, Get, Module } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  liveness(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'booking-api' };
  }

  @Get('ready')
  async readiness(): Promise<{ status: 'ok'; db: 'up' }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', db: 'up' };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [HealthController],
})
export class HealthModule {}
