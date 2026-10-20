import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { type AuthUser, IS_PUBLIC } from './decorators.js';
import { SupabaseJwtService } from './supabase-jwt.service.js';

/**
 * Global guard: every route needs a valid Supabase access token unless marked @Public().
 *
 * The token proves identity; the role comes from our own `profiles` table, never
 * from client-editable user metadata. First-time users get a PARENT profile;
 * operators are only created by the seed (or by hand).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: SupabaseJwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    let claims;
    try {
      claims = await this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const email = claims.email ?? '';
    const profile = await this.prisma.profile.upsert({
      where: { id: claims.sub },
      update: {},
      create: {
        id: claims.sub,
        email,
        fullName: claims.user_metadata?.full_name ?? email.split('@')[0],
        role: 'PARENT',
      },
      select: { id: true, email: true, role: true },
    });

    req.user = profile;
    return true;
  }
}
