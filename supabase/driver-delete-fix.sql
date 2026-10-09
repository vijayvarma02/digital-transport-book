-- Repair the existing foreign key. CREATE TABLE IF NOT EXISTS in schema.sql
-- cannot alter an older constraint that was created without ON DELETE CASCADE.
BEGIN;
ALTER TABLE public.daily_records
  DROP CONSTRAINT IF EXISTS daily_records_driver_id_fkey;
ALTER TABLE public.daily_records
  ADD CONSTRAINT daily_records_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;
COMMIT;
-- No rows are deleted by running this migration. On confirmed driver deletion,
-- PostgreSQL deletes the driver's daily records in the same transaction.
