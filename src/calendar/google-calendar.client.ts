import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import {
  getGoogleCalendarConfig,
  GOOGLE_CALENDAR_SCOPES,
} from './google-calendar.config';

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  scope: string | null;
  email: string | null;
};

export type GoogleCalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  conferenceLink?: string;
};

@Injectable()
export class GoogleCalendarClient {
  constructor(private readonly configService: ConfigService) {}

  buildAuthorizationUrl(state: string): string {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_CALENDAR_SCOPES,
      state,
      include_granted_scopes: true,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenSet> {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        'Google did not return a refresh token. Reconnect with consent prompt.',
      );
    }

    client.setCredentials(tokens);
    const email = await this.fetchPrimaryEmail(client);

    return {
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
      email,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date | null;
  }> {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return {
      accessToken: credentials.access_token ?? '',
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    await client.revokeToken(refreshToken);
  }

  async upsertEvent(
    refreshToken: string,
    providerEventId: string | null,
    event: GoogleCalendarEventInput,
  ): Promise<string> {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: client });

    const requestBody = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start.toISOString(),
      },
      end: {
        dateTime: event.end.toISOString(),
      },
    };

    if (providerEventId) {
      const updated = await calendar.events.update({
        calendarId: 'primary',
        eventId: providerEventId,
        requestBody,
      });
      return updated.data.id ?? providerEventId;
    }

    const created = await calendar.events.insert({
      calendarId: 'primary',
      requestBody,
    });
    if (!created.data.id) {
      throw new Error('Google Calendar did not return an event id.');
    }
    return created.data.id;
  }

  async deleteEvent(
    refreshToken: string,
    providerEventId: string,
  ): Promise<void> {
    const config = this.requireConfig();
    const client = this.createOAuthClient(config);
    client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: providerEventId,
    });
  }

  private requireConfig() {
    const config = getGoogleCalendarConfig(this.configService);
    if (!config) {
      throw new Error(
        'Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI.',
      );
    }
    return config;
  }

  private createOAuthClient(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }) {
    return new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    );
  }

  private async fetchPrimaryEmail(
    client: InstanceType<typeof google.auth.OAuth2>,
  ): Promise<string | null> {
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const profile = await oauth2.userinfo.get();
      return profile.data.email ?? null;
    } catch {
      return null;
    }
  }
}
