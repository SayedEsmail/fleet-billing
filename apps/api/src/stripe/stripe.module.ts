import { Module } from '@nestjs/common';
import { StripeWebhookService } from './stripe-webhook.service.js';
import { StripeController } from './stripe.controller.js';
import { StripeService } from './stripe.service.js';

@Module({
  controllers: [StripeController],
  providers: [StripeService, StripeWebhookService],
  exports: [StripeService],
})
export class StripeModule {}
