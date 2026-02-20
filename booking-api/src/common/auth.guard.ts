import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';

import { verifyAccessToken } from './jwt.util';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);
    let payload: unknown;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }

      if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
        throw new UnauthorizedException('Invalid bearer token');
      }

      throw new UnauthorizedException('Invalid bearer token');
    }

    (request as Request & { user?: unknown }).user = payload;
    return true;
  }
}
