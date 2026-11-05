-- 041: El rol admin es global (no pertenece a una finca) y puede leer/escribir
-- todos los datos de las organizaciones, como ya hacian las policies de 010.

-- El administrador por defecto (y cualquier admin existente) queda sin finca.
UPDATE public.profiles
SET organization_id = NULL
WHERE role = 'admin';

-- Los nuevos admins se crean siempre sin finca, aunque el alta envie organization_id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
  v_org_id_raw TEXT;
  v_farm_name TEXT;
  v_phone_raw TEXT;
  v_phone_digits TEXT;
  v_phone TEXT;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data ->> 'role', 'operario');
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

  IF v_role <> 'admin' THEN
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
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization_id, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    v_org_id,
    v_phone
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Acceso global del admin a toda tabla con RLS que cuelgue de una organizacion.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT DISTINCT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND a.attname IN ('organization_id', 'pond_id', 'batch_id')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin_full_access_' || t.table_name, t.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
      'admin_full_access_' || t.table_name,
      t.table_name
    );
  END LOOP;
END $$;
