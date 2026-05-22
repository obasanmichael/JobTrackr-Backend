import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

type OAuthStatePayload = {
  userId: string;
  purpose: string;
  nonce: string;
  exp: number;
};

@Injectable()
export class OAuthStateService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_KEY')?.trim();
    if (!secret) {
      throw new Error('ENCRYPTION_KEY is required for OAuth state signing.');
    }
    this.secret = secret;
  }

  create(userId: string, purpose: string, ttlMs = 10 * 60 * 1000): string {
    const payload: OAuthStatePayload = {
      userId,
      purpose,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + ttlMs,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(encoded);
    return `${encoded}.${signature}`;
  }

  verify(state: string, purpose: string): OAuthStatePayload {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }

    const expected = this.sign(encoded);
    const sigBuf = Buffer.from(signature, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Invalid OAuth state signature.');
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as OAuthStatePayload;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state payload.');
    }

    if (payload.purpose !== purpose) {
      throw new UnauthorizedException('OAuth state purpose mismatch.');
    }
    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('OAuth state expired.');
    }

    return payload;
  }

  private sign(encoded: string): string {
    return createHmac('sha256', this.secret)
      .update(encoded)
      .digest('base64url');
  }
}
