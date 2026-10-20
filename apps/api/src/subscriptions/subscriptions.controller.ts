import { Body, Controller, Get, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { type AuthUser, CurrentUser, Roles } from '../auth/decorators.js';
import { SubscriptionStatus } from '../generated/prisma/enums.js';
import { CheckoutDto } from './subscriptions.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @Roles('OPERATOR')
  findAll(@Query('status', new ParseEnumPipe(SubscriptionStatus, { optional: true })) status?: SubscriptionStatus) {
    return this.subscriptions.findAll(status);
  }

  @Get('mine')
  @Roles('PARENT')
  findMine(@CurrentUser() user: AuthUser) {
    return this.subscriptions.findMine(user);
  }

  @Post('checkout')
  @Roles('PARENT')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.subscriptions.startCheckout(user, dto);
  }
}
