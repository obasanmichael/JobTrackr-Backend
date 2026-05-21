import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUser } from '../types/current-user.type';

function parseAdminUserIds(configService: ConfigService): string[] {
  return (
    configService
      .get<string>('ADMIN_USER_IDS')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * Internal admin gate (Phase V2G). Requires a validated JWT (`JwtAuthGuard`) so `request.user` exists —
 * never use this guard without `JwtAuthGuard` on the same route.
 *
 * Access is granted if either:
 * - `ADMIN_USER_IDS` lists the user's id (temporary bootstrap until all admins are DB-backed), or
 * - An `AdminMembership` row exists for this user with `status === ACTIVE`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user =
      context.switchToHttp().getRequest<{ user?: CurrentUser }>().user ??
      undefined;

    if (!user?.userId) {
      throw new UnauthorizedException();
    }

    const envIds = parseAdminUserIds(this.configService);
    if (envIds.includes(user.userId)) {
      return true;
    }

    const row = await this.prisma.adminMembership.findUnique({
      where: { userId: user.userId },
      select: { status: true },
    });

    if (row?.status === 'ACTIVE') {
      return true;
    }

    throw new ForbiddenException('Admin access required.');
  }
}
