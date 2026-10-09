-- Run once in the Supabase SQL editor after schema.sql (existing installations
-- only need this migration). No additional application tables are created.
BEGIN;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS profile_photo text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS aadhaar_photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.daily_records ADD COLUMN IF NOT EXISTS pending_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (pending_amount >= 0);

-- Remove the original public policies before protecting the register.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('drivers', 'daily_records')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY register_access ON public.drivers FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true');
CREATE POLICY register_access ON public.daily_records FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driver-files', 'driver-files', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS register_files ON storage.objects;
CREATE POLICY register_files ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'driver-files' AND (auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true')
WITH CHECK (bucket_id = 'driver-files' AND (auth.jwt() -> 'app_metadata' ->> 'register_admin') = 'true');
COMMIT;

-- Next run passcode-login.sql and deploy register-login.
-- See PASSCODE_SETUP.md. No manually configured email account is required.
