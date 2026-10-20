import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { type AuthUser, CurrentUser } from './decorators.js';
import { RolesGuard } from './roles.guard.js';
import { SupabaseJwtService } from './supabase-jwt.service.js';

@Controller('me')
class MeController {
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

@Module({
  controllers: [MeController],
  providers: [
    SupabaseJwtService,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
