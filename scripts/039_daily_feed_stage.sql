-- ============================================================
-- 039_daily_feed_stage.sql — Etapa productiva en estanques y alimentación diaria
-- ============================================================

-- 1. Agregar production_stage a ponds (nullable, configurable por estanque)
ALTER TABLE public.ponds
  ADD COLUMN IF NOT EXISTS production_stage TEXT;

ALTER TABLE public.ponds
  DROP CONSTRAINT IF EXISTS ponds_production_stage_check;

ALTER TABLE public.ponds
  ADD CONSTRAINT ponds_production_stage_check
  CHECK (production_stage IS NULL OR production_stage IN ('levante', 'engorde'));

-- 2. Agregar production_stage a daily_feed_records (nullable, heredado del estanque)
ALTER TABLE public.daily_feed_records
  ADD COLUMN IF NOT EXISTS production_stage TEXT;

ALTER TABLE public.daily_feed_records
  DROP CONSTRAINT IF EXISTS daily_feed_records_production_stage_check;

ALTER TABLE public.daily_feed_records
  ADD CONSTRAINT daily_feed_records_production_stage_check
  CHECK (production_stage IS NULL OR production_stage IN ('levante', 'engorde'));
