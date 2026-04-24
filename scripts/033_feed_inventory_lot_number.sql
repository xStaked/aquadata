-- ============================================================
-- 033_feed_inventory_lot_number.sql
-- Migración: reemplazar invoice_no por lot_number en entradas
-- ============================================================

-- Agrega lot_number si no existe
ALTER TABLE public.feed_inventory_entries
  ADD COLUMN IF NOT EXISTS lot_number TEXT;

-- Elimina invoice_no si aún existe
ALTER TABLE public.feed_inventory_entries
  DROP COLUMN IF EXISTS invoice_no;

-- Refresca el schema cache para Supabase/PostgREST
NOTIFY pgrst, 'reload schema';
