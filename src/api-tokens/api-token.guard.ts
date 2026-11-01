import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CurrentUser } from '../common/types/current-user.type';
import { ApiTokensService } from './api-tokens.service';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: CurrentUser;
    }>();

    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing API token.');
    }

    const user = await this.apiTokensService.authenticate(token);
    if (!user) {
      throw new UnauthorizedException('Invalid, expired or revoked API token.');
    }

    request.user = user;
    return true;
  }
}
