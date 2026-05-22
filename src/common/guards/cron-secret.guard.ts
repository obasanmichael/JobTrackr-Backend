import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('CRON_SECRET')?.trim();
    if (!secret) {
      throw new UnauthorizedException('Cron secret is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const headerSecret = request.headers['x-cron-secret'];
    const provided =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : typeof headerSecret === 'string'
          ? headerSecret.trim()
          : '';

    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid cron secret.');
    }

    return true;
  }
}
