import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { verifyAccessToken } from './jwt.util';

jest.mock('./jwt.util', () => ({
  verifyAccessToken: jest.fn(),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when bearer token is missing', () => {
    const guard = new AuthGuard();
    const request = { headers: {} };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('attaches verified token payload to request', () => {
    const guard = new AuthGuard();
    const request = { headers: { authorization: 'Bearer token-123' } } as {
      headers: Record<string, string>;
      user?: unknown;
    };
    (verifyAccessToken as jest.Mock).mockReturnValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    });

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      sub: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    });
  });
});
