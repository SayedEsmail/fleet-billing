import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { Public } from '../auth/decorators.js';
import { CURRENCY, MAX_CHILDREN, PLANS, quote, siblingDiscountPercent, type BillingPeriod } from '../pricing/pricing.js';

class QuoteQuery {
  @IsIn(['MONTHLY', 'TERM'])
  period: BillingPeriod;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHILDREN)
  children: number;
}

/** Public, read-only pricing info: the web app shows these numbers but never computes them. */
@Public()
@Controller('plans')
export class PlansController {
  @Get()
  list() {
    return {
      currency: CURRENCY,
      maxChildren: MAX_CHILDREN,
      siblingDiscounts: [1, 2, 3].map((position) => ({ position, percent: siblingDiscountPercent(position) })),
      plans: (Object.keys(PLANS) as BillingPeriod[]).map((period) => ({ period, ...PLANS[period] })),
    };
  }

  @Get('quote')
  quote(@Query() q: QuoteQuery) {
    return quote(q.period, q.children);
  }
}
