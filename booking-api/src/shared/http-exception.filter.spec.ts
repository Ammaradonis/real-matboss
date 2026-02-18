import { ArgumentsHost, BadRequestException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('formats known HTTP exceptions', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const response = {
      status: jest.fn(() => ({ json })),
    };
    const request = { url: '/api/v1/bookings' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new BadRequestException('bad input'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        path: '/api/v1/bookings',
      }),
    );
  });

  it('formats unknown errors as 500', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const response = {
      status: jest.fn(() => ({ json })),
    };
    const request = { url: '/api/v1/health' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
      }),
    );
  });
});
