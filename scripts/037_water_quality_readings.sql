-- 037: Tabla de lecturas rápidas de oxígeno y temperatura
-- Permite registrar mediciones parciales sin un reporte diario completo.
-- Estas lecturas se pueden usar para pre-llenar el formulario diario.

CREATE TABLE IF NOT EXISTS public.water_quality_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id UUID NOT NULL REFERENCES public.ponds(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  reading_date DATE NOT NULL,
  reading_time TIME,
  temperature_c NUMERIC,
  oxygen_mg_l NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_water_quality_readings_pond_date
  ON public.water_quality_readings(pond_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_water_quality_readings_pond_created
  ON public.water_quality_readings(pond_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_water_quality_readings_batch_date
  ON public.water_quality_readings(batch_id, reading_date DESC);

-- RLS
ALTER TABLE public.water_quality_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_quality_select" ON public.water_quality_readings FOR SELECT TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

CREATE POLICY "water_quality_insert" ON public.water_quality_readings FOR INSERT TO authenticated
  WITH CHECK (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

CREATE POLICY "water_quality_update" ON public.water_quality_readings FOR UPDATE TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

CREATE POLICY "water_quality_delete" ON public.water_quality_readings FOR DELETE TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

COMMENT ON TABLE public.water_quality_readings IS
  'Lecturas parciales de calidad del agua (O2/T) registradas independientemente del reporte diario';
