-- Run after profile-upgrade.sql. Only service_role can use the limiter.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.register_login_limit (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
REVOKE ALL ON private.register_login_limit FROM PUBLIC, anon, authenticated;
INSERT INTO private.register_login_limit (id) VALUES (true) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.take_register_login_attempt()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE count_now integer;
BEGIN
  UPDATE private.register_login_limit
  SET attempts = CASE WHEN window_started_at < clock_timestamp() - interval '10 minutes' THEN 1 ELSE attempts + 1 END,
      window_started_at = CASE WHEN window_started_at < clock_timestamp() - interval '10 minutes' THEN clock_timestamp() ELSE window_started_at END
  WHERE id = true RETURNING attempts INTO count_now;
  RETURN COALESCE(count_now <= 20, false);
END;
$$;
REVOKE ALL ON FUNCTION public.take_register_login_attempt() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_register_login_attempt() TO service_role;

-- Remove the manual-email login's authorization. Only function-issued sessions
-- now receive access. Existing manually configured owner sessions must log in again.
DROP POLICY IF EXISTS register_access ON public.drivers;
CREATE POLICY register_access ON public.drivers FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true');
DROP POLICY IF EXISTS register_access ON public.daily_records;
CREATE POLICY register_access ON public.daily_records FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true');
DROP POLICY IF EXISTS register_files ON storage.objects;
CREATE POLICY register_files ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'driver-files' AND (auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true')
WITH CHECK (bucket_id = 'driver-files' AND (auth.jwt() -> 'app_metadata' ->> 'register_passcode_login') = 'true');
COMMIT;
