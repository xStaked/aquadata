-- ============================================================
-- 038_daily_feed_records.sql — Registro diario de alimentación
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_feed_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  record_date     DATE        NOT NULL,
  concentrate_id  UUID        REFERENCES public.feed_concentrates(id) ON DELETE SET NULL,
  concentrate_name TEXT       NOT NULL,
  bags_am         NUMERIC     NOT NULL DEFAULT 0 CHECK (bags_am >= 0),
  bags_pm         NUMERIC     NOT NULL DEFAULT 0 CHECK (bags_pm >= 0),
  bags_total      NUMERIC     GENERATED ALWAYS AS (COALESCE(bags_am, 0) + COALESCE(bags_pm, 0)) STORED,
  kg_per_bag      NUMERIC     NOT NULL DEFAULT 40 CHECK (kg_per_bag > 0),
  kg_total        NUMERIC     GENERATED ALWAYS AS ((COALESCE(bags_am, 0) + COALESCE(bags_pm, 0)) * COALESCE(kg_per_bag, 40)) STORED,
  mortality_count INTEGER     NOT NULL DEFAULT 0 CHECK (mortality_count >= 0),
  reference       TEXT,
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_feed_records_batch ON public.daily_feed_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_daily_feed_records_date ON public.daily_feed_records(record_date);
CREATE INDEX IF NOT EXISTS idx_daily_feed_records_concentrate ON public.daily_feed_records(concentrate_id);
CREATE INDEX IF NOT EXISTS idx_daily_feed_records_batch_date ON public.daily_feed_records(batch_id, record_date);

-- Constraint: un registro por lote/fecha/concentrado
ALTER TABLE public.daily_feed_records
  DROP CONSTRAINT IF EXISTS daily_feed_records_batch_date_concentrate_key;
ALTER TABLE public.daily_feed_records
  ADD CONSTRAINT daily_feed_records_batch_date_concentrate_key
  UNIQUE (batch_id, record_date, concentrate_id);

-- RLS
ALTER TABLE public.daily_feed_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_feed_select" ON public.daily_feed_records;
DROP POLICY IF EXISTS "daily_feed_insert" ON public.daily_feed_records;
DROP POLICY IF EXISTS "daily_feed_update" ON public.daily_feed_records;
DROP POLICY IF EXISTS "daily_feed_delete" ON public.daily_feed_records;

CREATE POLICY "daily_feed_select" ON public.daily_feed_records
  FOR SELECT USING (
    batch_id IN (
      SELECT b.id FROM public.batches b
      JOIN public.ponds p ON p.id = b.pond_id
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "daily_feed_insert" ON public.daily_feed_records
  FOR INSERT WITH CHECK (
    public.is_org_writer(auth.uid())
    AND batch_id IN (
      SELECT b.id FROM public.batches b
      JOIN public.ponds p ON p.id = b.pond_id
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "daily_feed_update" ON public.daily_feed_records
  FOR UPDATE USING (
    public.is_org_writer(auth.uid())
    AND batch_id IN (
      SELECT b.id FROM public.batches b
      JOIN public.ponds p ON p.id = b.pond_id
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "daily_feed_delete" ON public.daily_feed_records
  FOR DELETE USING (
    public.is_org_writer(auth.uid())
    AND batch_id IN (
      SELECT b.id FROM public.batches b
      JOIN public.ponds p ON p.id = b.pond_id
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );
