-- Add record_time to production_records for capturing sampling/measurement time
ALTER TABLE public.production_records
  ADD COLUMN IF NOT EXISTS record_time TIME;
