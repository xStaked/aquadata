-- Add water quality fields to production_records
ALTER TABLE public.production_records
  ADD COLUMN IF NOT EXISTS phosphate_mg_l NUMERIC,
  ADD COLUMN IF NOT EXISTS hardness_mg_l NUMERIC,
  ADD COLUMN IF NOT EXISTS alkalinity_mg_l NUMERIC;
