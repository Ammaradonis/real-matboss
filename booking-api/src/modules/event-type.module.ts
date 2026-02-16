import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { resolveTenantId } from '../common/tenant-context';
import { EventTypeEntity, EventTypeKind } from '../database/entities';

class CreateEventTypeDto {
  @IsString()
  providerId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsEnum(EventTypeKind)
  kind!: EventTypeKind;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

@Controller('event-types')
class EventTypeController {
  constructor(
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepository: Repository<EventTypeEntity>,
  ) {}

  @Get('provider/:providerId')
  async listForProvider(
    @Param('providerId') providerId: string,
    @Req() req: Request,
  ): Promise<EventTypeEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.eventTypeRepository.find({
      where: { tenantId, providerId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('provider/:providerId/slug/:slug')
  async bySlug(
    @Param('providerId') providerId: string,
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<EventTypeEntity | null> {
    const tenantId = resolveTenantId(req);
    return this.eventTypeRepository.findOne({
      where: { tenantId, providerId, slug },
    });
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() input: CreateEventTypeDto, @Req() req: Request): Promise<EventTypeEntity> {
    const tenantId = resolveTenantId(req);
    return this.eventTypeRepository.save(
      this.eventTypeRepository.create({
        tenantId,
        providerId: input.providerId,
        name: input.name,
        slug: input.slug,
        kind: input.kind,
        durationMinutes: input.durationMinutes,
        maxAttendees: input.maxAttendees ?? null,
        priceCents: input.priceCents ?? 0,
        requiresApproval: input.requiresApproval ?? false,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body() input: UpdateEventTypeDto,
    @Req() req: Request,
  ): Promise<EventTypeEntity | null> {
    const tenantId = resolveTenantId(req);
    const item = await this.eventTypeRepository.findOne({ where: { tenantId, id } });
    if (!item) {
      return null;
    }
    Object.assign(item, input);
    return this.eventTypeRepository.save(item);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([EventTypeEntity])],
  controllers: [EventTypeController],
})
export class EventTypeModule {}
