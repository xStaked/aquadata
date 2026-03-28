CREATE OR REPLACE FUNCTION public.touch_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.bioremediation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('agua', 'suelo')),
  description TEXT NOT NULL,
  presentation TEXT,
  dose_unit TEXT NOT NULL DEFAULT 'L/ha',
  application_method TEXT,
  species_scope TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bioremediation_products_slug_idx
  ON public.bioremediation_products (slug);

CREATE INDEX IF NOT EXISTS bioremediation_products_active_idx
  ON public.bioremediation_products (is_active);

CREATE INDEX IF NOT EXISTS bioremediation_products_sort_idx
  ON public.bioremediation_products (sort_order, name);

ALTER TABLE public.bioremediation_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bioremediation_products_select_active" ON public.bioremediation_products;
CREATE POLICY "bioremediation_products_select_active" ON public.bioremediation_products
  FOR SELECT TO authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_full_access_bioremediation_products" ON public.bioremediation_products;
CREATE POLICY "admin_full_access_bioremediation_products" ON public.bioremediation_products
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS bioremediation_products_touch_updated_at ON public.bioremediation_products;
CREATE TRIGGER bioremediation_products_touch_updated_at
  BEFORE UPDATE ON public.bioremediation_products
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();
