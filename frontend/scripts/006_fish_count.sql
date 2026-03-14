-- Add fish_count to production_records
ALTER TABLE public.production_records
  ADD COLUMN IF NOT EXISTS fish_count INTEGER;
