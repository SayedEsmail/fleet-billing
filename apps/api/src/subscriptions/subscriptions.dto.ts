import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID } from 'class-validator';
import { type BillingPeriod, MAX_CHILDREN } from '../pricing/pricing.js';

export class CheckoutDto {
  @IsIn(['MONTHLY', 'TERM'])
  period: BillingPeriod;

  @IsUUID()
  tripId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CHILDREN)
  @IsUUID('all', { each: true })
  childIds: string[];

  /** Locale to return to after Stripe. */
  @IsOptional()
  @IsIn(['en', 'ar'])
  locale?: 'en' | 'ar';
}
