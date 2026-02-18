import {
  Body,
  Controller,
  ForbiddenException,
  Module,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { signAccessToken, signRefreshToken } from '../common/jwt.util';
import { resolveTenantId } from '../common/tenant-context';
import {
  ApiTokenEntity,
  RefreshTokenEntity,
  UserEntity,
  UserRole,
} from '../database/entities';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

class LogoutDto {
  @IsString()
  refreshToken!: string;
}

class ValidateApiTokenDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  scope?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(ApiTokenEntity)
    private readonly apiTokenRepository: Repository<ApiTokenEntity>,
  ) {}

  @Post('register')
  async register(@Body() input: RegisterDto, @Req() req: Request): Promise<unknown> {
    const tenantId = resolveTenantId(req);
    const existing = await this.userRepository.findOne({
      where: { tenantId, email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ForbiddenException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.userRepository.save(
      this.userRepository.create({
        tenantId,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        role: UserRole.MEMBER,
      }),
    );

    return this.issueTokenPair(user.id, user.tenantId, user.role);
  }

  @Post('login')
  async login(@Body() input: LoginDto, @Req() req: Request): Promise<unknown> {
    const tenantId = resolveTenantId(req);
    const user = await this.userRepository.findOne({
      where: { tenantId, email: input.email.toLowerCase(), isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user.id, user.tenantId, user.role);
  }

  @Post('refresh')
  async refresh(@Body() input: RefreshDto): Promise<unknown> {
    const rows = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.revoked_at IS NULL')
      .andWhere('rt.expires_at > NOW()')
      .orderBy('rt.created_at', 'DESC')
      .getMany();

    const activeMatch = await this.findActiveRefresh(rows, input.refreshToken);
    if (!activeMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: activeMatch.userId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    activeMatch.revokedAt = new Date();
    await this.refreshTokenRepository.save(activeMatch);

    return this.issueTokenPair(user.id, user.tenantId, user.role);
  }

  @Post('logout')
  async logout(@Body() input: LogoutDto): Promise<{ revoked: boolean }> {
    const rows = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.revoked_at IS NULL')
      .andWhere('rt.expires_at > NOW()')
      .orderBy('rt.created_at', 'DESC')
      .getMany();

    const activeMatch = await this.findActiveRefresh(rows, input.refreshToken);
    if (activeMatch) {
      activeMatch.revokedAt = new Date();
      await this.refreshTokenRepository.save(activeMatch);
    }

    return { revoked: true };
  }

  @Post('token/validate')
  async validateToken(@Body() input: ValidateApiTokenDto): Promise<{ valid: boolean }> {
    const token = await this.apiTokenRepository.findOne({ where: { token: input.token, isActive: true } });
    if (!token) {
      return { valid: false };
    }

    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
      return { valid: false };
    }

    if (input.scope && token.scope !== input.scope) {
      return { valid: false };
    }

    return { valid: true };
  }

  private async issueTokenPair(userId: string, tenantId: string, role: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  }> {
    const refreshTokenId = crypto.randomUUID();

    const accessToken = signAccessToken({ sub: userId, tenantId, role });
    const refreshToken = signRefreshToken({ sub: userId, tenantId, tokenId: refreshTokenId });

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        tenantId,
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: '1h',
      refreshExpiresIn: '7d',
    };
  }

  private async findActiveRefresh(
    rows: RefreshTokenEntity[],
    rawToken: string,
  ): Promise<RefreshTokenEntity | null> {
    for (const row of rows) {
      if (row.revokedAt || row.expiresAt.getTime() < Date.now()) {
        continue;
      }
      const matches = await bcrypt.compare(rawToken, row.tokenHash);
      if (matches) {
        return row;
      }
    }
    return null;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, ApiTokenEntity])],
  controllers: [AuthController],
})
export class AuthModule {}
