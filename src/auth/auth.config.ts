import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

export type AuthConfig = {
  accessSecret: string;
  accessExpiresIn: StringValue;
  issuer?: string;
  audience?: string;
};

export function getAuthConfig(configService: ConfigService): AuthConfig {
  const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is required for auth configuration.');
  }

  const accessExpiresInRaw =
    configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  const expiresInRegex = /^\d+(ms|s|m|h|d|w|y)$/;
  if (!expiresInRegex.test(accessExpiresInRaw)) {
    throw new Error(
      'JWT_ACCESS_EXPIRES_IN must match duration format like 15m, 1h, or 7d.',
    );
  }
  const accessExpiresIn = accessExpiresInRaw as StringValue;

  // Issuer/audience are intentionally optional for MVP and can be enabled later.
  const issuer = configService.get<string>('JWT_ISSUER');
  const audience = configService.get<string>('JWT_AUDIENCE');

  return {
    accessSecret,
    accessExpiresIn,
    issuer,
    audience,
  };
}
