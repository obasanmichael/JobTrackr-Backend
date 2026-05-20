import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import type { CurrentUser } from '../../common/types/current-user.type';

/** Allows unauthenticated requests; attaches user when a valid Bearer token is present. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const activation = super.canActivate(context);
      if (isObservable(activation)) {
        return await lastValueFrom(activation);
      }
      if (activation instanceof Promise) {
        return await activation;
      }
      return activation;
    } catch {
      return true;
    }
  }

  handleRequest<TUser = CurrentUser>(
    err: Error | null,
    user: TUser,
  ): TUser | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
