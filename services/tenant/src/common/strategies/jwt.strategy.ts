/**
 * Vote Capsule™ Tenant Service — JWT Strategy
 *
 * Lightweight JWT validation for inter-service auth.
 * Decodes and validates the JWT issued by Identity Service.
 * No DB lookup — trusts the signed token (same secret).
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@vote-capsule/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      issuer: 'vote-capsule-identity',
      audience: 'vote-capsule-platform',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return payload;
  }
}
