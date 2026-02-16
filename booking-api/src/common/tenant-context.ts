import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';

export function resolveTenantId(request: Request): string {
  const tenantId =
    (request.headers['x-tenant-id'] as string | undefined) ?? DEMO_TENANT_ID;

  if (!tenantId || typeof tenantId !== 'string') {
    throw new BadRequestException('Missing tenant id');
  }

  return tenantId;
}
