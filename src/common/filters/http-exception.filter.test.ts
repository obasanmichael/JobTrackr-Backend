import { ArgumentsHost, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const buildHost = () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const response = { status, json };
    const request = { url: '/api/v1/auth/login' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, response };
  };

  it('formats validation exceptions consistently', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = buildHost();

    filter.catch(
      new BadRequestException(['email must be an email', 'password is required']),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        path: '/api/v1/auth/login',
        message: ['email must be an email', 'password is required'],
        details: ['email must be an email', 'password is required'],
      }),
    );
  });

  it('formats auth exceptions consistently', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = buildHost();

    filter.catch(new UnauthorizedException('Invalid credentials'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: 'Unauthorized',
        path: '/api/v1/auth/login',
        message: 'Invalid credentials',
      }),
    );
  });
});
