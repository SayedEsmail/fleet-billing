import { plainToInstance } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

/** Validated environment. The app refuses to boot with a missing or malformed variable. */
export class Env {
  @IsString()
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  /** Only needed if the Supabase project still signs JWTs with the legacy HS256 secret. */
  @IsOptional()
  @IsString()
  SUPABASE_JWT_SECRET?: string;

  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET: string;

  /** Public URL of the web app, used for Stripe redirect URLs and CORS. */
  @IsUrl({ require_tld: false })
  WEB_URL: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  PORT?: string;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, {
    ...config,
    // Allow sharing one .env.local with the web app.
    SUPABASE_URL: config.SUPABASE_URL ?? config.NEXT_PUBLIC_SUPABASE_URL,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const names = errors.map((e) => e.property).join(', ');
    throw new Error(`Invalid environment variables: ${names}`);
  }
  return env;
}
