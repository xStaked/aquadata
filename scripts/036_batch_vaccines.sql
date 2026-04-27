-- ============================================================
--  VACUNACIÓN POR LOTE
-- ============================================================

-- Tipos de vacuna personalizables por organización
CREATE TABLE IF NOT EXISTS public.vaccine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vaccine_types ENABLE ROW LEVEL SECURITY;

-- Registros de vacunación por lote
CREATE TABLE IF NOT EXISTS public.batch_vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  vaccine_type_id UUID REFERENCES public.vaccine_types(id) ON DELETE SET NULL,
  vaccine_type_name TEXT, -- snapshot por si el tipo se borra
  is_vaccinated BOOLEAN NOT NULL DEFAULT false,
  application_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.batch_vaccines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vaccine_types
CREATE POLICY "vaccine_types_select" ON public.vaccine_types FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "vaccine_types_insert" ON public.vaccine_types FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "vaccine_types_update" ON public.vaccine_types FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "vaccine_types_delete" ON public.vaccine_types FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for batch_vaccines
CREATE POLICY "batch_vaccines_select" ON public.batch_vaccines FOR SELECT TO authenticated
  USING (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batch_vaccines_insert" ON public.batch_vaccines FOR INSERT TO authenticated
  WITH CHECK (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batch_vaccines_update" ON public.batch_vaccines FOR UPDATE TO authenticated
  USING (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batch_vaccines_delete" ON public.batch_vaccines FOR DELETE TO authenticated
  USING (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

-- Admin policies for vaccine_types
DROP POLICY IF EXISTS "admin_full_access_vaccine_types" ON public.vaccine_types;
CREATE POLICY "admin_full_access_vaccine_types" ON public.vaccine_types
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'admin');

-- Admin policies for batch_vaccines
DROP POLICY IF EXISTS "admin_full_access_batch_vaccines" ON public.batch_vaccines;
CREATE POLICY "admin_full_access_batch_vaccines" ON public.batch_vaccines
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'admin');
