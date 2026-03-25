CREATE OR REPLACE FUNCTION public.sync_bioremediation_case_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.status <> 'approved' THEN
    NEW.status_usable_for_grounding := false;
  ELSIF NEW.status_usable_for_grounding IS NULL THEN
    NEW.status_usable_for_grounding := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.bioremediation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue TEXT NOT NULL,
  zone TEXT NOT NULL,
  species TEXT NOT NULL,
  product_name TEXT NOT NULL,
  treatment_approach TEXT NOT NULL,
  dose NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'L',
  outcome TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'retired')),
  status_usable_for_grounding BOOLEAN NOT NULL DEFAULT false,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  last_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bioremediation_cases_grounding_requires_approved
    CHECK (status = 'approved' OR status_usable_for_grounding = false)
);

CREATE INDEX IF NOT EXISTS bioremediation_cases_status_idx
  ON public.bioremediation_cases (status);

CREATE INDEX IF NOT EXISTS bioremediation_cases_species_idx
  ON public.bioremediation_cases (species);

CREATE INDEX IF NOT EXISTS bioremediation_cases_product_name_idx
  ON public.bioremediation_cases (product_name);

CREATE INDEX IF NOT EXISTS bioremediation_cases_grounding_idx
  ON public.bioremediation_cases (status_usable_for_grounding)
  WHERE status_usable_for_grounding = true;

ALTER TABLE public.bioremediation_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_bioremediation_cases" ON public.bioremediation_cases;
CREATE POLICY "admin_full_access_bioremediation_cases" ON public.bioremediation_cases
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS bioremediation_cases_sync_state ON public.bioremediation_cases;
CREATE TRIGGER bioremediation_cases_sync_state
  BEFORE INSERT OR UPDATE ON public.bioremediation_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bioremediation_case_state();
