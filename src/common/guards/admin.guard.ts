import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../types/current-user.type';

/**
 * Minimal admin gate until Phase V2G (DB roles): allow only user ids listed in ADMIN_USER_IDS.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const user =
      context
        .switchToHttp()
        .getRequest<{ user?: CurrentUser }>().user ??
      undefined;

    if (!user?.userId) {
      throw new UnauthorizedException();
    }

    const ids =
      this.configService
        .get<string>('ADMIN_USER_IDS')
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    if (ids.includes(user.userId)) {
      return true;
    }

    throw new ForbiddenException('Admin access required.');
  }
}
