import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { AdminGuard } from './roles.guard';

describe('AdminGuard', () => {
  it('rejects non-admin users', () => {
    const guard = new AdminGuard();
    const request = { user: { role: 'MEMBER' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows admin users', () => {
    const guard = new AdminGuard();
    const request = { user: { role: 'ADMIN' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
