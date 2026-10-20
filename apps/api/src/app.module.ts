import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { BusesModule } from './buses/buses.module.js';
import { ChildrenModule } from './children/children.module.js';
import { validateEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { PlansModule } from './plans/plans.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StatsModule } from './stats/stats.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { TripsModule } from './trips/trips.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Root .env.local is shared with the web app; the api-local one wins.
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    PlansModule,
    BusesModule,
    TripsModule,
    ChildrenModule,
    SubscriptionsModule,
    StripeModule,
    StatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
