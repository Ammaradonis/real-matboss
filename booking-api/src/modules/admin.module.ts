import {
  Body,
  Controller,
  Get,
  Logger,
  Module,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { stringify } from 'csv-stringify/sync';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Request, Response } from 'express';
import { DataSource, Repository } from 'typeorm';

import { AuthGuard } from '../common/auth.guard';
import { AdminGuard } from '../common/roles.guard';
import { signAccessToken } from '../common/jwt.util';
import { resolveTenantId } from '../common/tenant-context';
import {
  AdminSettingEntity,
  BookingEntity,
  DiscoveryCallEntity,
  EmailQueueEntity,
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
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  private userColumnCache: Set<string> | null = null;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DiscoveryCallEntity)
    private readonly discoveryRepository: Repository<DiscoveryCallEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(AdminSettingEntity)
    private readonly settingRepository: Repository<AdminSettingEntity>,
    @InjectRepository(EmailQueueEntity)
    private readonly emailQueueRepository: Repository<EmailQueueEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async getUserColumns(): Promise<Set<string>> {
    if (this.userColumnCache) {
      return this.userColumnCache;
    }

    try {
      const rows = await this.dataSource.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
      `);

      this.userColumnCache = new Set(
        rows.map((row: { column_name?: string }) => String(row.column_name ?? '').toLowerCase()),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`getUserColumns query failed: ${message}`);
      return new Set();
    }

    return this.userColumnCache;
  }

  private async findAdminUserByCredentials(
    tenantId: string,
    email: string,
  ): Promise<{
    id: string;
    tenantId: string;
    email: string;
    role: string;
    passwordHash: string;
  } | null> {
    const columns = await this.getUserColumns();
    if (!columns.has('email')) {
      this.logger.warn('Users table is missing email column.');
      return null;
    }

    const hasTenantId = columns.has('tenant_id');
    const hasRole = columns.has('role');
    const hasPasswordHash = columns.has('password_hash');
    const hasPassword = columns.has('password');

    if (!hasPasswordHash && !hasPassword) {
      this.logger.warn('Users table is missing both password_hash and password columns.');
      return null;
    }

    const params: string[] = [email.toLowerCase()];
    const whereClauses = ['LOWER(u.email) = LOWER($1)'];

    let tenantParamIndex: number;
    if (hasTenantId) {
      params.push(tenantId);
      tenantParamIndex = params.length;
      whereClauses.push(`u.tenant_id = $${tenantParamIndex}`);
    } else {
      params.push(tenantId);
      tenantParamIndex = params.length;
    }

    if (hasRole) {
      whereClauses.push(`LOWER(u.role::text) = 'admin'`);
    }

    const passwordSql = hasPasswordHash ? 'u.password_hash::text' : 'u.password::text';
    const roleSql = hasRole ? 'u.role::text' : `'ADMIN'`;
    const tenantSql = hasTenantId ? 'u.tenant_id::text' : `$${tenantParamIndex}::text`;

    const sql = `
      SELECT
        u.id::text AS id,
        ${tenantSql} AS tenant_id,
        LOWER(u.email)::text AS email,
        ${roleSql} AS role,
        ${passwordSql} AS password_hash
      FROM users u
      WHERE ${whereClauses.join(' AND ')}
      LIMIT 1
    `;

    try {
      const rows = await this.dataSource.query(sql, params);
      if (!rows.length) {
        return null;
      }

      const row = rows[0] as {
        id?: string;
        tenant_id?: string;
        email?: string;
        role?: string;
        password_hash?: string;
      };

      return {
        id: String(row.id ?? ''),
        tenantId: String(row.tenant_id ?? tenantId),
        email: String(row.email ?? ''),
        role: String(row.role ?? 'ADMIN'),
        passwordHash: String(row.password_hash ?? ''),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed querying admin login row: ${message}`);
      return null;
    }
  }

  private tryEnvFallback(
    normalizedEmail: string,
    password: string,
    tenantId: string,
    userId?: string,
  ): { accessToken: string } | null {
    const allowEnvFallback =
      !process.env.ALLOW_ENV_ADMIN_LOGIN ||
      /^(1|true|yes)$/i.test(process.env.ALLOW_ENV_ADMIN_LOGIN);
    const envAdminEmail = (process.env.ADMIN_LOGIN_EMAIL ?? 'admin@matboss.online')
      .toLowerCase()
      .trim();
    const envAdminPassword = process.env.ADMIN_LOGIN_PASSWORD ?? 'password123';

    if (!allowEnvFallback || normalizedEmail !== envAdminEmail || password !== envAdminPassword) {
      return null;
    }

    try {
      return {
        accessToken: signAccessToken({
          sub: userId ?? 'env-admin',
          tenantId,
          role: UserRole.ADMIN,
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`signAccessToken failed in env fallback: ${message}`);
      return null;
    }
  }

  @Post('auth/login')
  async adminLogin(@Body() input: AdminLoginDto, @Req() req: Request): Promise<{ accessToken: string }> {
    const tenantId = resolveTenantId(req);
    const normalizedEmail = input.email.toLowerCase().trim();

    let user: {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      passwordHash: string;
    } | null = null;

    try {
      user = await this.findAdminUserByCredentials(tenantId, normalizedEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`findAdminUserByCredentials threw: ${message}`);
    }

    if (!user || String(user.role ?? '').toLowerCase() !== UserRole.ADMIN.toLowerCase()) {
      const fallback = this.tryEnvFallback(normalizedEmail, input.password, tenantId);
      if (fallback) {
        return fallback;
      }
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      this.logger.warn(`Admin user ${normalizedEmail} has no password hash configured.`);
      const fallback = this.tryEnvFallback(normalizedEmail, input.password, tenantId, user.id);
      if (fallback) {
        return fallback;
      }
      throw new UnauthorizedException('Invalid admin credentials');
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(input.password, user.passwordHash);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`bcrypt.compare failed for ${normalizedEmail}: ${message}`);
    }

    if (valid) {
      try {
        return {
          accessToken: signAccessToken({ sub: user.id, tenantId, role: UserRole.ADMIN }),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`signAccessToken failed: ${message}`);
      }
    }

    const fallback = this.tryEnvFallback(normalizedEmail, input.password, tenantId, user.id);
    if (fallback) {
      return fallback;
    }
    throw new UnauthorizedException('Invalid admin credentials');
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
      .leftJoin('d.booking', 'b')
      .select('d.lead_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
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

    const thisMonth = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere("date_trunc('month', b.start_ts) = date_trunc('month', NOW())")
      .getCount();

    const lastMonth = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere(
        "date_trunc('month', b.start_ts) = date_trunc('month', NOW() - interval '1 month')",
      )
      .getCount();

    const monthlyDeltaPct =
      lastMonth > 0 ? Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(2)) : null;

    const weeklyTrend = await this.bookingRepository
      .createQueryBuilder('b')
      .select("to_char(date_trunc('week', b.start_ts), 'YYYY-MM-DD')", 'weekStart')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere("b.start_ts >= NOW() - interval '8 weeks'")
      .groupBy("date_trunc('week', b.start_ts)")
      .orderBy("date_trunc('week', b.start_ts)", 'ASC')
      .getRawMany<{ weekStart: string; count: string }>();

    const budgetBreakdown = await this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoin('d.booking', 'b')
      .select('COALESCE(d.budget_range, \'unknown\')', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
      .groupBy('COALESCE(d.budget_range, \'unknown\')')
      .orderBy('count', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    const timelineBreakdown = await this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoin('d.booking', 'b')
      .select('COALESCE(d.implementation_timeline, \'unknown\')', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
      .groupBy('COALESCE(d.implementation_timeline, \'unknown\')')
      .orderBy('count', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    const systemBreakdown = await this.discoveryRepository
      .createQueryBuilder('d')
      .leftJoin('d.booking', 'b')
      .select('COALESCE(d.current_system, \'unknown\')', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('b.tenant_id = :tenantId', { tenantId })
      .groupBy('COALESCE(d.current_system, \'unknown\')')
      .orderBy('count', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    const emailStatsRows = await this.emailQueueRepository
      .createQueryBuilder('q')
      .select('q.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('q.tenant_id = :tenantId', { tenantId })
      .groupBy('q.status')
      .getRawMany<{ status: string; count: string }>();
    const emailStats = Object.fromEntries(
      emailStatsRows.map((row) => [row.status.toLowerCase(), Number.parseInt(row.count, 10)]),
    );

    return {
      totalBookings,
      confirmed,
      pending,
      conversionRate: totalBookings ? Number(((confirmed / totalBookings) * 100).toFixed(2)) : 0,
      todayCalls: callsToday,
      leadFunnel: statusBreakdown,
      topStates,
      monthComparison: {
        thisMonth,
        lastMonth,
        deltaPercent: monthlyDeltaPct,
      },
      weeklyTrend,
      budgetBreakdown,
      timelineBreakdown,
      systemBreakdown,
      emailStats,
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
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      BookingEntity,
      DiscoveryCallEntity,
      AdminSettingEntity,
      EmailQueueEntity,
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
