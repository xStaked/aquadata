-- Adds a read-only viewer role and restricts org writes to admin/operario.

CREATE OR REPLACE FUNCTION public.is_org_writer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role IN ('admin', 'operario')
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_id_raw TEXT;
  v_farm_name TEXT;
  v_phone_raw TEXT;
  v_phone_digits TEXT;
  v_phone TEXT;
BEGIN
  v_farm_name := new.raw_user_meta_data ->> 'farm_name';
  v_org_id_raw := new.raw_user_meta_data ->> 'organization_id';
  v_phone_raw := COALESCE(new.raw_user_meta_data ->> 'phone', '');
  v_phone_digits := regexp_replace(v_phone_raw, '\D', '', 'g');
  v_phone := NULL;

  IF v_phone_raw ~ '^\+57\d{10}$' THEN
    v_phone := v_phone_raw;
  ELSIF v_phone_digits ~ '^\d{10}$' THEN
    v_phone := '+57' || v_phone_digits;
  ELSIF v_phone_digits ~ '^57\d{10}$' THEN
    v_phone := '+' || v_phone_digits;
  END IF;

  IF v_org_id_raw IS NOT NULL AND v_org_id_raw ~* '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE id = v_org_id_raw::uuid;
  END IF;

  IF v_org_id IS NULL AND v_farm_name IS NOT NULL AND v_farm_name != '' THEN
    INSERT INTO public.organizations (name)
    VALUES (v_farm_name)
    RETURNING id INTO v_org_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization_id, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'operario'),
    v_org_id,
    v_phone
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP POLICY IF EXISTS "organizations_update_same_org" ON public.organizations;
CREATE POLICY "organizations_update_same_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND public.is_org_writer(auth.uid())
  )
  WITH CHECK (
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "ponds_insert" ON public.ponds;
CREATE POLICY "ponds_insert" ON public.ponds FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "ponds_update" ON public.ponds;
CREATE POLICY "ponds_update" ON public.ponds FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "ponds_delete" ON public.ponds;
CREATE POLICY "ponds_delete" ON public.ponds FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "batches_insert" ON public.batches;
CREATE POLICY "batches_insert" ON public.batches FOR INSERT TO authenticated
  WITH CHECK (
    pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "batches_update" ON public.batches;
CREATE POLICY "batches_update" ON public.batches FOR UPDATE TO authenticated
  USING (
    pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "batches_delete" ON public.batches;
CREATE POLICY "batches_delete" ON public.batches FOR DELETE TO authenticated
  USING (
    pond_id IN (SELECT p.id FROM public.ponds p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "uploads_select" ON public.uploads;
CREATE POLICY "uploads_select" ON public.uploads FOR SELECT TO authenticated
  USING (
    batch_id IS NULL
    OR batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.ponds p ON p.id = b.pond_id
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "uploads_insert" ON public.uploads;
CREATE POLICY "uploads_insert" ON public.uploads FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_writer(auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "uploads_update" ON public.uploads;
CREATE POLICY "uploads_update" ON public.uploads FOR UPDATE TO authenticated
  USING (
    public.is_org_writer(auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "records_insert" ON public.production_records;
CREATE POLICY "records_insert" ON public.production_records FOR INSERT TO authenticated
  WITH CHECK (
    batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "records_update" ON public.production_records;
CREATE POLICY "records_update" ON public.production_records FOR UPDATE TO authenticated
  USING (
    batch_id IN (SELECT b.id FROM public.batches b JOIN public.ponds p ON p.id = b.pond_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid())
    AND public.is_org_writer(auth.uid())
  );

DROP POLICY IF EXISTS "bioremediation_insert" ON public.bioremediation_calcs;
CREATE POLICY "bioremediation_insert" ON public.bioremediation_calcs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_org_writer(auth.uid())
  );

DO $$
BEGIN
  IF to_regclass('public.feed_concentrates') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "concentrates_insert" ON public.feed_concentrates';
    EXECUTE 'CREATE POLICY "concentrates_insert" ON public.feed_concentrates FOR INSERT TO authenticated
      WITH CHECK (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "concentrates_update" ON public.feed_concentrates';
    EXECUTE 'CREATE POLICY "concentrates_update" ON public.feed_concentrates FOR UPDATE TO authenticated
      USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "concentrates_delete" ON public.feed_concentrates';
    EXECUTE 'CREATE POLICY "concentrates_delete" ON public.feed_concentrates FOR DELETE TO authenticated
      USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND public.is_org_writer(auth.uid())
      )';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.monthly_feed_records') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "feed_records_insert" ON public.monthly_feed_records';
    EXECUTE 'CREATE POLICY "feed_records_insert" ON public.monthly_feed_records FOR INSERT TO authenticated
      WITH CHECK (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "feed_records_update" ON public.monthly_feed_records';
    EXECUTE 'CREATE POLICY "feed_records_update" ON public.monthly_feed_records FOR UPDATE TO authenticated
      USING (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "feed_records_delete" ON public.monthly_feed_records';
    EXECUTE 'CREATE POLICY "feed_records_delete" ON public.monthly_feed_records FOR DELETE TO authenticated
      USING (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.harvest_records') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "harvest_insert" ON public.harvest_records';
    EXECUTE 'CREATE POLICY "harvest_insert" ON public.harvest_records FOR INSERT TO authenticated
      WITH CHECK (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "harvest_update" ON public.harvest_records';
    EXECUTE 'CREATE POLICY "harvest_update" ON public.harvest_records FOR UPDATE TO authenticated
      USING (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';

    EXECUTE 'DROP POLICY IF EXISTS "harvest_delete" ON public.harvest_records';
    EXECUTE 'CREATE POLICY "harvest_delete" ON public.harvest_records FOR DELETE TO authenticated
      USING (
        batch_id IN (
          SELECT b.id FROM public.batches b
          JOIN public.ponds p ON p.id = b.pond_id
          JOIN public.profiles pr ON pr.organization_id = p.organization_id
          WHERE pr.id = auth.uid()
        )
        AND public.is_org_writer(auth.uid())
      )';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.alerts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "alerts_update_same_org" ON public.alerts';
    EXECUTE 'CREATE POLICY "alerts_update_same_org" ON public.alerts FOR UPDATE TO authenticated
      USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND public.is_org_writer(auth.uid())
      )';
  END IF;
END $$;
