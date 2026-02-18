import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { resolveTenantId } from '../common/tenant-context';
import { ProviderEntity } from '../database/entities';

class CreateProviderDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  specialties?: string;

  @IsString()
  bookingUrl!: string;

  @IsOptional()
  @IsString()
  timeZone?: string;
}

class UpdateProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  specialties?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ProviderSettingsDto {
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(168)
  minimumNoticeHours!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  maximumAdvanceDays!: number;
}

@Controller('providers')
export class ProviderController {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
  ) {}

  @Get()
  async list(@Req() req: Request): Promise<ProviderEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.providerRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  async byId(@Param('id') id: string, @Req() req: Request): Promise<ProviderEntity | null> {
    const tenantId = resolveTenantId(req);
    return this.providerRepository.findOne({ where: { tenantId, id } });
  }

  @Get('by-url/:tenantSlug/:bookingUrl')
  async byUrl(
    @Param('tenantSlug') tenantSlug: string,
    @Param('bookingUrl') bookingUrl: string,
  ): Promise<{ tenantSlug: string; provider: ProviderEntity | null }> {
    const provider = await this.providerRepository
      .createQueryBuilder('p')
      .innerJoin('tenants', 't', 't.id = p.tenant_id')
      .where('t.slug = :tenantSlug', { tenantSlug })
      .andWhere('p.booking_url = :bookingUrl', { bookingUrl })
      .andWhere('p.is_active = TRUE')
      .getOne();
    return { tenantSlug, provider };
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() input: CreateProviderDto, @Req() req: Request): Promise<ProviderEntity> {
    const tenantId = resolveTenantId(req);
    const entity = this.providerRepository.create({
      tenantId,
      name: input.name,
      bio: input.bio ?? '',
      specialties: input.specialties ?? '',
      bookingUrl: input.bookingUrl,
      timeZone: input.timeZone ?? 'America/New_York',
    });
    return this.providerRepository.save(entity);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body() input: UpdateProviderDto,
    @Req() req: Request,
  ): Promise<ProviderEntity | null> {
    const tenantId = resolveTenantId(req);
    const provider = await this.providerRepository.findOne({ where: { id, tenantId } });
    if (!provider) {
      return null;
    }

    Object.assign(provider, input);
    return this.providerRepository.save(provider);
  }

  @UseGuards(AuthGuard)
  @Put(':id/settings')
  async updateSettings(
    @Param('id') id: string,
    @Body() input: ProviderSettingsDto,
    @Req() req: Request,
  ): Promise<ProviderEntity | null> {
    const tenantId = resolveTenantId(req);
    const provider = await this.providerRepository.findOne({ where: { id, tenantId } });
    if (!provider) {
      return null;
    }

    provider.bufferBeforeMinutes = input.bufferBeforeMinutes;
    provider.bufferAfterMinutes = input.bufferAfterMinutes;
    provider.minimumNoticeHours = input.minimumNoticeHours;
    provider.maximumAdvanceDays = input.maximumAdvanceDays;

    return this.providerRepository.save(provider);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request): Promise<{ deleted: boolean }> {
    const tenantId = resolveTenantId(req);
    const result = await this.providerRepository.delete({ id, tenantId });
    return { deleted: (result.affected ?? 0) > 0 };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ProviderEntity])],
  controllers: [ProviderController],
  exports: [TypeOrmModule],
})
export class ProviderModule {}
