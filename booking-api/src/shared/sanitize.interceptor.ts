import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (request?.body) {
      request.body = this.sanitizeValue(request.body);
    }

    if (request?.query) {
      request.query = this.sanitizeValue(request.query);
    }

    return next.handle();
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
          key,
          this.sanitizeValue(nestedValue),
        ]),
      );
    }

    return value;
  }
}
