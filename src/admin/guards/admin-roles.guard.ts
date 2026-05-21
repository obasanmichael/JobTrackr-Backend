import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '@prisma/client';
import { AdminMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user.type';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const user =
      context.switchToHttp().getRequest<{ user?: CurrentUser }>().user ??
      undefined;
    if (!user?.userId) {
      throw new UnauthorizedException();
    }

    const row = await this.prisma.adminMembership.findUnique({
      where: { userId: user.userId },
      select: { role: true, status: true },
    });

    if (!row || row.status !== AdminMembershipStatus.ACTIVE) {
      throw new ForbiddenException('Admin membership required.');
    }

    if (!required.includes(row.role)) {
      throw new ForbiddenException('Insufficient admin role.');
    }

    return true;
  }
}
