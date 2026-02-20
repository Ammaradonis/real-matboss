import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  tokenId: string;
}

function getAccessSecret(): string {
  const raw = process.env.JWT_SECRET;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'dev-access-secret';
}

function getRefreshSecret(): string {
  const raw = process.env.JWT_REFRESH_SECRET;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'dev-refresh-secret';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: '1h',
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
}
