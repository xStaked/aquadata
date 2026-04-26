-- Módulo de Traslados (Batch Transfers)
-- Registra movimientos de animales entre estanques, permitiendo
-- trazabilidad de ciclos de levante a engorde.

CREATE TABLE public.batch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Origen
  source_batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  source_pond_id UUID NOT NULL REFERENCES public.ponds(id) ON DELETE CASCADE,

  -- Destino
  destination_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  destination_pond_id UUID NOT NULL REFERENCES public.ponds(id) ON DELETE CASCADE,

  transfer_date DATE NOT NULL,
  animal_count INTEGER NOT NULL CHECK (animal_count > 0),
  avg_weight_g NUMERIC,

  -- Tipo de traslado (informativo para reportes)
  is_partial_harvest BOOLEAN NOT NULL DEFAULT false,

  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_transfers_org ON public.batch_transfers(organization_id);
CREATE INDEX idx_batch_transfers_source_batch ON public.batch_transfers(source_batch_id);
CREATE INDEX idx_batch_transfers_dest_batch ON public.batch_transfers(destination_batch_id);
CREATE INDEX idx_batch_transfers_date ON public.batch_transfers(transfer_date);

ALTER TABLE public.batch_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY batch_transfer_select ON public.batch_transfers
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY batch_transfer_insert ON public.batch_transfers
  FOR INSERT WITH CHECK (
    public.is_org_writer(auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY batch_transfer_delete ON public.batch_transfers
  FOR DELETE USING (
    public.is_org_writer(auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
  );
