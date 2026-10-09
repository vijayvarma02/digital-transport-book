ALTER TABLE public.daily_records
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT ''
  CHECK (char_length(notes) <= 1000);
