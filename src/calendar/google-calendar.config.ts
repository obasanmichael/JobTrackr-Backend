import { ConfigService } from '@nestjs/config';

export type GoogleCalendarConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGoogleCalendarConfig(
  configService: ConfigService,
): GoogleCalendarConfig | null {
  const clientId = configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
  const clientSecret = configService
    .get<string>('GOOGLE_CLIENT_SECRET')
    ?.trim();
  const redirectUri = configService
    .get<string>('GOOGLE_CALENDAR_REDIRECT_URI')
    ?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export const GOOGLE_CALENDAR_OAUTH_PURPOSE = 'google-calendar';
