import { ConfigService } from '@nestjs/config';

export type AuthConfig = {
  accessSecret: string;
  accessExpiresIn: string;
  issuer?: string;
  audience?: string;
};

export function getAuthConfig(configService: ConfigService): AuthConfig {
  const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is required for auth configuration.');
  }

  const accessExpiresIn =
    configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

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
