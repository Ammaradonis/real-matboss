import bcrypt from 'bcrypt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.module';
import { RefreshTokenEntity, UserRole } from '../database/entities';

function buildController() {
  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'user-1', ...value })),
  };

  const refreshTokenRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    createQueryBuilder: jest.fn(),
  };

  const apiTokenRepository = {
    findOne: jest.fn(),
  };

  const controller = new AuthController(
    userRepository as never,
    refreshTokenRepository as never,
    apiTokenRepository as never,
  );

  return { controller, userRepository, refreshTokenRepository, apiTokenRepository };
}

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects duplicate registrations', async () => {
    const { controller, userRepository } = buildController();
    userRepository.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      controller.register(
        { email: 'admin@example.com', password: 'password123', name: 'Admin' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('registers new users and returns token pair', async () => {
    const { controller, userRepository, refreshTokenRepository } = buildController();
    userRepository.findOne.mockResolvedValue(null);

    const response = await controller.register(
      { email: 'new@example.com', password: 'password123', name: 'New User' },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(response).toEqual(
      expect.objectContaining({
        accessExpiresIn: '1h',
        refreshExpiresIn: '7d',
      }),
    );
    expect(refreshTokenRepository.save).toHaveBeenCalled();
  });

  it('rejects invalid login password', async () => {
    const { controller, userRepository } = buildController();
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('correct-password', 10),
      role: UserRole.MEMBER,
      isActive: true,
    });

    await expect(
      controller.login(
        { email: 'admin@example.com', password: 'wrong-password' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes valid refresh token and revokes old one', async () => {
    const { controller, userRepository, refreshTokenRepository } = buildController();
    const rawRefresh = 'refresh-token-value';
    const tokenHash = await bcrypt.hash(rawRefresh, 10);

    const row = {
      id: 'rt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as RefreshTokenEntity;

    refreshTokenRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([row]),
    });

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: UserRole.ADMIN,
      isActive: true,
    });

    const response = await controller.refresh({ refreshToken: rawRefresh });

    expect(response).toEqual(
      expect.objectContaining({
        accessExpiresIn: '1h',
        refreshExpiresIn: '7d',
      }),
    );
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });

  it('returns unauthorized for invalid refresh token', async () => {
    const { controller, refreshTokenRepository } = buildController();
    refreshTokenRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    await expect(controller.refresh({ refreshToken: 'bad-token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes refresh token on logout when matched', async () => {
    const { controller, refreshTokenRepository } = buildController();
    const rawRefresh = 'refresh-token-value';
    const row = {
      id: 'rt-logout',
      tokenHash: await bcrypt.hash(rawRefresh, 10),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    };

    refreshTokenRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([row]),
    });

    await expect(controller.logout({ refreshToken: rawRefresh })).resolves.toEqual({ revoked: true });
    expect(refreshTokenRepository.save).toHaveBeenCalled();
  });

  it('validates API tokens with scope checks', async () => {
    const { controller, apiTokenRepository } = buildController();
    apiTokenRepository.findOne.mockResolvedValue({
      token: 'widget-token',
      scope: 'widget:read',
      isActive: true,
      expiresAt: new Date(Date.now() + 120_000),
    });

    await expect(controller.validateToken({ token: 'widget-token', scope: 'widget:write' })).resolves
      .toEqual({ valid: false });
    await expect(controller.validateToken({ token: 'widget-token', scope: 'widget:read' })).resolves
      .toEqual({ valid: true });
  });
});
