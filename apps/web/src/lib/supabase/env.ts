// Literal `process.env.NEXT_PUBLIC_*` accesses so Next can inline them in the browser bundle.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
export const supabaseKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'missing-publishable-key';
