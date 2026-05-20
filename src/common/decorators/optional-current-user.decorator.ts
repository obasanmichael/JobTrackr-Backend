import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '../types/current-user.type';

export const OptionalCurrentUserDecorator = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUser | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: CurrentUser | null }>();
    return request.user ?? null;
  },
);
