import { BadRequestException, Controller, Headers, HttpCode, Logger, Post, type RawBodyRequest, Req } from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { Public } from '../auth/decorators.js';
import { StripeWebhookService } from './stripe-webhook.service.js';
import { StripeService } from './stripe.service.js';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly webhooks: StripeWebhookService,
  ) {}

  /** Authenticated by Stripe's signature, not by a user token. */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    if (!signature || !req.rawBody) throw new BadRequestException('Missing Stripe signature');

    let event: Stripe.Event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    const outcome = await this.webhooks.handle(event);
    this.logger.log(`${event.type} ${event.id} → ${outcome}`);
    return { received: true, outcome };
  }
}
