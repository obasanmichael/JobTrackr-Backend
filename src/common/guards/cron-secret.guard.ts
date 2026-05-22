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
    let provided = '';
    if (typeof headerSecret === 'string') {
      provided = headerSecret.trim();
    } else if (typeof authorization === 'string') {
      const value = authorization.trim();
      provided = value.startsWith('Bearer ')
        ? value.slice('Bearer '.length).trim()
        : value;
    }

    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid cron secret.');
    }

    return true;
  }
}
