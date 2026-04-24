-- ============================================================
-- 032_feed_inventory.sql — Inventario de concentrado
-- ============================================================

-- 1. Entradas de inventario (compras / ajustes)
CREATE TABLE IF NOT EXISTS public.feed_inventory_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  concentrate_id  UUID        NOT NULL REFERENCES public.feed_concentrates(id) ON DELETE CASCADE,
  bags_received   NUMERIC     NOT NULL DEFAULT 0 CHECK (bags_received >= 0),
  kg_per_bag      NUMERIC     NOT NULL DEFAULT 40 CHECK (kg_per_bag > 0),
  price_per_bag   NUMERIC     NOT NULL DEFAULT 0 CHECK (price_per_bag >= 0),
  supplier        TEXT,
  lot_number      TEXT,
  entry_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_inventory_entries ENABLE ROW LEVEL SECURITY;

-- Idempotent policies: drop if exists, then create
DROP POLICY IF EXISTS "inventory_select" ON public.feed_inventory_entries;
DROP POLICY IF EXISTS "inventory_insert" ON public.feed_inventory_entries;
DROP POLICY IF EXISTS "inventory_update" ON public.feed_inventory_entries;
DROP POLICY IF EXISTS "inventory_delete" ON public.feed_inventory_entries;
DROP POLICY IF EXISTS "viewer_inventory_select" ON public.feed_inventory_entries;

CREATE POLICY "inventory_select" ON public.feed_inventory_entries FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "inventory_insert" ON public.feed_inventory_entries FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "inventory_update" ON public.feed_inventory_entries FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "inventory_delete" ON public.feed_inventory_entries FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- 2. Vista: stock disponible por concentrado y organización
CREATE OR REPLACE VIEW public.feed_stock_summary AS
WITH entries AS (
  SELECT
    i.organization_id,
    i.concentrate_id,
    SUM(i.bags_received) AS total_bags,
    SUM(i.bags_received * i.kg_per_bag) AS total_kg_in
  FROM public.feed_inventory_entries i
  GROUP BY i.organization_id, i.concentrate_id
),
consumption AS (
  SELECT
    p.organization_id,
    m.concentrate_id,
    SUM(m.kg_used) AS total_kg_out
  FROM public.monthly_feed_records m
  JOIN public.batches b ON b.id = m.batch_id
  JOIN public.ponds p ON p.id = b.pond_id
  GROUP BY p.organization_id, m.concentrate_id
)
SELECT
  e.organization_id,
  e.concentrate_id,
  COALESCE(e.total_bags, 0)::NUMERIC AS total_bags,
  COALESCE(e.total_kg_in, 0)::NUMERIC AS total_kg_in,
  COALESCE(c.total_kg_out, 0)::NUMERIC AS total_kg_out,
  GREATEST(COALESCE(e.total_kg_in, 0) - COALESCE(c.total_kg_out, 0), 0)::NUMERIC AS available_kg
FROM entries e
LEFT JOIN consumption c
  ON c.organization_id = e.organization_id
  AND c.concentrate_id = e.concentrate_id;

-- 3. Vista: costo/kg de la última compra por concentrado
CREATE OR REPLACE VIEW public.feed_latest_entry_cost AS
SELECT DISTINCT ON (organization_id, concentrate_id)
  organization_id,
  concentrate_id,
  price_per_bag / kg_per_bag AS latest_cost_per_kg,
  entry_date
FROM public.feed_inventory_entries
ORDER BY organization_id, concentrate_id, entry_date DESC;
