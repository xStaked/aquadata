-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'operario',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ponds
CREATE TABLE IF NOT EXISTS public.ponds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_m2 NUMERIC,
  depth_m NUMERIC,
  species TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ponds ENABLE ROW LEVEL SECURITY;

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id UUID NOT NULL REFERENCES public.ponds(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  initial_population INTEGER NOT NULL,
  current_population INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Uploads
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  raw_ocr_text TEXT,
  processed_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Production Records
CREATE TABLE IF NOT EXISTS public.production_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  record_date DATE NOT NULL,
  feed_kg NUMERIC,
  avg_weight_g NUMERIC,
  mortality_count INTEGER DEFAULT 0,
  temperature_c NUMERIC,
  oxygen_mg_l NUMERIC,
  calculated_fca NUMERIC,
  calculated_biomass_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;

-- Bioremediation Calculations
CREATE TABLE IF NOT EXISTS public.bioremediation_calcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pond_length NUMERIC NOT NULL,
  pond_width NUMERIC NOT NULL,
  pond_depth NUMERIC NOT NULL,
  volume_m3 NUMERIC NOT NULL,
  bioremediation_dose NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bioremediation_calcs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_select_org" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for ponds
CREATE POLICY "ponds_select" ON public.ponds FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "ponds_insert" ON public.ponds FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "ponds_update" ON public.ponds FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "ponds_delete" ON public.ponds FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for batches
CREATE POLICY "batches_select" ON public.batches FOR SELECT TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batches_insert" ON public.batches FOR INSERT TO authenticated
  WITH CHECK (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batches_update" ON public.batches FOR UPDATE TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "batches_delete" ON public.batches FOR DELETE TO authenticated
  USING (pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

-- RLS Policies for uploads
CREATE POLICY "uploads_select" ON public.uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "uploads_insert" ON public.uploads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "uploads_update" ON public.uploads FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for production_records
CREATE POLICY "records_select" ON public.production_records FOR SELECT TO authenticated
  USING (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "records_insert" ON public.production_records FOR INSERT TO authenticated
  WITH CHECK (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));
CREATE POLICY "records_update" ON public.production_records FOR UPDATE TO authenticated
  USING (batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()));

-- RLS Policies for bioremediation_calcs
CREATE POLICY "bioremediation_select" ON public.bioremediation_calcs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "bioremediation_insert" ON public.bioremediation_calcs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'operario')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
