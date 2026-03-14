ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_fca NUMERIC;

ALTER TABLE public.production_records
ADD COLUMN IF NOT EXISTS effective_fca NUMERIC;

ALTER TABLE public.production_records
ADD COLUMN IF NOT EXISTS fca_source TEXT;

UPDATE public.production_records
SET
  effective_fca = COALESCE(effective_fca, calculated_fca),
  fca_source = COALESCE(fca_source, CASE WHEN calculated_fca IS NOT NULL THEN 'calculated' ELSE NULL END)
WHERE effective_fca IS NULL OR fca_source IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_records_fca_source_check'
  ) THEN
    ALTER TABLE public.production_records
    ADD CONSTRAINT production_records_fca_source_check
    CHECK (fca_source IS NULL OR fca_source IN ('calculated', 'default'));
  END IF;
END
$$;
