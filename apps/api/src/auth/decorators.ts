import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/enums.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Skips authentication (health, pricing, Stripe webhook). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restricts a controller or route to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
