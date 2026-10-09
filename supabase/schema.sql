-- ==============================================================================
-- DIGITAL TRANSPORT BOOK - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. Create Drivers Table (phone is mandatory, name is unique)
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Daily Records Table
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Enforce 1 record per driver per date
    CONSTRAINT unique_driver_date UNIQUE (driver_id, date)
);

-- 3. Create Index for fast month and driver lookups
CREATE INDEX IF NOT EXISTS idx_daily_records_driver_date 
ON public.daily_records (driver_id, date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- 5. Policies for access (allow anon reads & writes)
CREATE POLICY "Allow public read access on drivers" 
ON public.drivers FOR SELECT USING (true);

CREATE POLICY "Allow public insert on drivers" 
ON public.drivers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on drivers" 
ON public.drivers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on drivers" 
ON public.drivers FOR DELETE USING (true);

CREATE POLICY "Allow public read access on daily_records" 
ON public.daily_records FOR SELECT USING (true);

CREATE POLICY "Allow public insert on daily_records" 
ON public.daily_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on daily_records" 
ON public.daily_records FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on daily_records" 
ON public.daily_records FOR DELETE USING (true);

-- 6. Initial Seed Data: 10 Drivers with distinct phones
INSERT INTO public.drivers (name, phone) VALUES
    ('Ramesh', '9848011223'),
    ('Suresh', '9848022334'),
    ('Mahesh', '9848033445'),
    ('Ravi', '9848044556'),
    ('Kiran', '9848055667'),
    ('Anil', '9848066778'),
    ('Rajesh', '9848077889'),
    ('Srinu', '9848088990'),
    ('Vijay', '9848099001'),
    ('Naresh', '9848012349')
ON CONFLICT (name) DO UPDATE 
SET phone = EXCLUDED.phone;
