import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUser } from '../../common/types/current-user.type';
import { getAuthConfig } from '../auth.config';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authConfig = getAuthConfig(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessSecret,
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    });
  }

  validate(payload: JwtPayload): CurrentUser {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
