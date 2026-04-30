ALTER TABLE public.harvest_records
ADD COLUMN IF NOT EXISTS hidden_mortality INTEGER NOT NULL DEFAULT 0;
