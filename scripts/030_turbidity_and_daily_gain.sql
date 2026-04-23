-- Migration 030: Add turbidity (manual water quality) and daily weight gain (calculated)

ALTER TABLE public.production_records
  ADD COLUMN IF NOT EXISTS turbidity_ntu NUMERIC;

-- Daily weight gain in grams/day (ADG - Average Daily Gain)
-- Calculated automatically when a record is created, comparing avg_weight with the previous record of the same batch.
ALTER TABLE public.production_records
  ADD COLUMN IF NOT EXISTS daily_gain_g NUMERIC;
