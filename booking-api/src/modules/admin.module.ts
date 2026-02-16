import {
  Body,
  Controller,
  Get,
  Module,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { stringify } from 'csv-stringify/sync';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { AdminGuard } from '../common/roles.guard';
import { signAccessToken } from '../common/jwt.util';
import { resolveTenantId } from '../common/tenant-context';
import {
  AdminSettingEntity,
  BookingEntity,
  DiscoveryCallEntity,
  LeadStatus,
  UserEntity,
  UserRole,
} from '../database/entities';

class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class UpdateLeadStatusDto {
  @IsString()
  discoveryId!: string;

  @IsString()
  leadStatus!: LeadStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

class FollowUpDto {
  @IsString()
  discoveryId!: string;

  @IsString()
  followUpAt!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateSettingDto {
  @IsString()
  key!: string;

  value!: Record<string, unknown>;
}

@Controller('admin')
class AdminController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DiscoveryCallEntity)
    private readonly discoveryRepository: Repository<DiscoveryCallEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(AdminSettingEntity)
    private readonly settingRepository: Repository<AdminSettingEntity>,
  ) {}

  @Post('auth/login')
  async adminLogin(@Body() input: AdminLoginDto, @Req() req: Request): Promise<{ accessToken: string }> {
    const tenantId = resolveTenantId(req);
    const user = await this.userRepository.findOne({
      where: { tenantId, email: input.email.toLowerCase(), role: UserRole.ADMIN },
    });

    if (!user) {
      return { accessToken: '' };
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return { accessToken: '' };
    }

    return {
      accessToken: signAccessToken({ sub: user.id, tenantId, role: UserRole.ADMIN }),
    };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('discovery')
  async discoveryList(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('leadStatus') leadStatus?: LeadStatus,
  ): Promise<DiscoveryCallEntity[]> {
    const tenantId = resolveTenantId(req);

    const qb = this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.booking', 'b')
      .where('b.tenant_id = :tenantId', { tenantId });

    if (leadStatus) {
      qb.andWhere('d.lead_status = :leadStatus', { leadStatus });
    }

    if (q?.trim()) {
      qb.andWhere(
        '(LOWER(d.school_name) LIKE :q OR LOWER(b.customer_name) LIKE :q OR LOWER(b.customer_email) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    return qb.orderBy('d.created_at', 'DESC').getMany();
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('discovery/lead-status')
  async updateLeadStatus(@Body() input: UpdateLeadStatusDto): Promise<{ updated: boolean }> {
    const discovery = await this.discoveryRepository.findOne({ where: { id: input.discoveryId } });
    if (!discovery) {
      return { updated: false };
    }

    discovery.leadStatus = input.leadStatus;
    discovery.adminNotes = input.note ?? discovery.adminNotes;
    await this.discoveryRepository.save(discovery);
    return { updated: true };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('discovery/follow-up')
  async setFollowUp(@Body() input: FollowUpDto): Promise<{ updated: boolean }> {
    const discovery = await this.discoveryRepository.findOne({ where: { id: input.discoveryId } });
    if (!discovery) {
      return { updated: false };
    }

    discovery.followUpAt = new Date(input.followUpAt);
    discovery.adminNotes = input.note ?? discovery.adminNotes;
    await this.discoveryRepository.save(discovery);
    return { updated: true };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('analytics')
  async analytics(@Req() req: Request): Promise<Record<string, unknown>> {
    const tenantId = resolveTenantId(req);

    const totalBookings = await this.bookingRepository.count({ where: { tenantId } });
    const confirmed = await this.bookingRepository.count({
      where: { tenantId, status: 'CONFIRMED' as never },
    });
    const pending = await this.bookingRepository.count({
      where: { tenantId, status: 'PENDING' as never },
    });
    const callsToday = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(b.start_ts) = CURRENT_DATE')
      .getCount();

    const statusBreakdown = await this.discoveryRepository
      .createQueryBuilder('d')
      .select('d.lead_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.lead_status')
      .getRawMany<{ status: string; count: string }>();

    const topStates = await this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoin('d.booking', 'b')
      .select('d.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
      .groupBy('d.state')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalBookings,
      confirmed,
      pending,
      conversionRate: totalBookings ? Number(((confirmed / totalBookings) * 100).toFixed(2)) : 0,
      todayCalls: callsToday,
      leadFunnel: statusBreakdown,
      topStates,
    };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('export/csv')
  async csvExport(@Req() req: Request, @Res() res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const rows = await this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.booking', 'b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .orderBy('d.created_at', 'DESC')
      .getMany();

    const csv = stringify(
      rows.map((row) => ({
        bookingId: row.bookingId,
        schoolName: row.schoolName,
        city: row.city,
        state: row.state,
        county: row.county,
        activeStudents: row.activeStudents,
        instructorCount: row.instructorCount,
        budgetRange: row.budgetRange,
        timeline: row.implementationTimeline,
        leadStatus: row.leadStatus,
        qualificationScore: row.qualificationScore,
        followUpAt: row.followUpAt?.toISOString() ?? '',
        adminNotes: row.adminNotes ?? '',
      })),
      { header: true },
    );

    res.setHeader('content-type', 'text/csv');
    res.setHeader('content-disposition', 'attachment; filename="discovery-leads.csv"');
    res.send(csv);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('settings')
  async settings(@Req() req: Request): Promise<AdminSettingEntity[]> {
    const tenantId = resolveTenantId(req);
    return this.settingRepository.find({ where: { tenantId }, order: { key: 'ASC' } });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('settings')
  async upsertSetting(@Body() input: UpdateSettingDto, @Req() req: Request): Promise<AdminSettingEntity> {
    const tenantId = resolveTenantId(req);
    const existing = await this.settingRepository.findOne({ where: { tenantId, key: input.key } });

    if (existing) {
      existing.value = input.value;
      return this.settingRepository.save(existing);
    }

    return this.settingRepository.save(
      this.settingRepository.create({
        tenantId,
        key: input.key,
        value: input.value,
      }),
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, BookingEntity, DiscoveryCallEntity, AdminSettingEntity])],
  controllers: [AdminController],
})
export class AdminModule {}
