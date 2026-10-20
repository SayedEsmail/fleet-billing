import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { SubscriptionStatus } from '../generated/prisma/enums.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  findAll(@Query('status', new ParseEnumPipe(SubscriptionStatus, { optional: true })) status?: SubscriptionStatus) {
    return this.subscriptions.findAll(status);
  }
}
