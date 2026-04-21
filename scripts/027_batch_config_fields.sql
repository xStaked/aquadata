-- ============================================================
-- 027_batch_config_fields.sql — Campos adicionales de configuración del lote
-- ============================================================

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS operating_fixed_costs   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_profit_amount    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bioaqua_quantity        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bioterra_quantity       NUMERIC DEFAULT 0;
