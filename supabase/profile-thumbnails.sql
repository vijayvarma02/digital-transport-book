-- Only paths are added; original photos and private access policies are preserved.
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS profile_thumbnail text;
