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

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'dev-access-secret', {
    expiresIn: '1h',
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret', {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(
    token,
    process.env.JWT_SECRET ?? 'dev-access-secret',
  ) as AccessTokenPayload;
}
