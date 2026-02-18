import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

import { SanitizeInterceptor } from './sanitize.interceptor';

describe('SanitizeInterceptor', () => {
  it('sanitizes body and query values', (done) => {
    const interceptor = new SanitizeInterceptor();
    const request = {
      body: {
        name: '<b>Ammar</b>',
        note: '<script>alert(1)</script>Hello',
      },
      query: {
        q: '<i>dojo</i>',
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: jest.fn(() => of('ok')),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe(() => {
      expect(request.body).toEqual({
        name: 'Ammar',
        note: 'Hello',
      });
      expect(request.query).toEqual({ q: 'dojo' });
      done();
    });
  });
});
