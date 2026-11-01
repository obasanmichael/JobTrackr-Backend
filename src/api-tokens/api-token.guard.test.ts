import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiTokenGuard } from './api-token.guard';

describe('ApiTokenGuard', () => {
  const user = { userId: 'user-1', email: 'user@example.com' };
  let authenticate: jest.Mock;
  let guard: ApiTokenGuard;

  const contextFor = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    authenticate = jest.fn();
    guard = new ApiTokenGuard({ authenticate } as never);
  });

  it('attaches the user for a valid bearer token', async () => {
    authenticate.mockResolvedValue(user);
    const request: { headers: object; user?: unknown } = {
      headers: { authorization: 'Bearer jt_abc' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(authenticate).toHaveBeenCalledWith('jt_abc');
    expect(request.user).toEqual(user);
  });

  it.each([
    ['no header', {}],
    ['wrong scheme', { authorization: 'Basic abc' }],
    ['no token', { authorization: 'Bearer' }],
  ])('rejects %s', async (_label, headers) => {
    await expect(
      guard.canActivate(contextFor({ headers })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('rejects when the token is not valid', async () => {
    authenticate.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer jt_bad' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
