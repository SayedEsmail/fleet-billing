import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  email?: string;
  user_metadata?: { full_name?: string };
}

/**
 * Verifies Supabase Auth access tokens.
 *
 * Current Supabase projects sign with asymmetric keys published at the JWKS
 * endpoint, so no shared secret is needed. Projects still on the legacy HS256
 * secret can set SUPABASE_JWT_SECRET.
 */
@Injectable()
export class SupabaseJwtService {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly legacySecret?: Uint8Array;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    this.issuer = `${url}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(config.get<string>('SUPABASE_JWKS_URL') ?? `${this.issuer}/.well-known/jwks.json`),
    );
    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    if (secret) this.legacySecret = new TextEncoder().encode(secret);
  }

  async verify(token: string): Promise<SupabaseClaims> {
    const options = { issuer: this.issuer, audience: 'authenticated' };
    const { alg } = decodeProtectedHeader(token);
    const { payload } =
      alg === 'HS256' && this.legacySecret
        ? await jwtVerify(token, this.legacySecret, { ...options, algorithms: ['HS256'] })
        : await jwtVerify(token, this.jwks, { ...options, algorithms: ['ES256', 'RS256'] });
    if (!payload.sub) throw new Error('Token has no subject');
    return payload as SupabaseClaims;
  }
}
