-- Row Level Security on "subscriptions".
--
-- The API writes through the table owner (which bypasses RLS). Reads of a
-- parent's own subscriptions run as the `authenticated` role with the JWT
-- claims set for the transaction (PrismaService.asUser), so ownership is
-- enforced by Postgres, not by a WHERE clause the API could forget.
--
-- Written to run on Supabase *and* on plain Postgres (docker compose): the
-- `auth` schema, roles and `auth.uid()` are created only when missing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- The migrating user must be able to SET ROLE authenticated (already true on Supabase).
DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'authenticated', 'MEMBER') THEN
    EXECUTE format('GRANT authenticated TO %I', current_user);
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    -- Same definition Supabase ships.
    EXECUTE $fn$
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $body$
        SELECT nullif(
          coalesce(
            current_setting('request.jwt.claim.sub', true),
            current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
          ),
          ''
        )::uuid
      $body$
    $fn$;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Everything except subscriptions is only reachable through the API.
-- (On Supabase this also hides the tables from the auto-generated Data API.)
REVOKE ALL ON "profiles", "buses", "trips", "children", "_ChildToSubscription", "stripe_events" FROM anon, authenticated;
REVOKE ALL ON "subscriptions" FROM anon, authenticated;
GRANT SELECT ON "subscriptions" TO authenticated;

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents read own subscriptions"
  ON "subscriptions" FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies: with RLS on, those are denied for
-- `anon`/`authenticated`. Only the API (and the Stripe webhook) writes.
