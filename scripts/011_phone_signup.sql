-- Add phone support for signup profiles (Colombia: +57XXXXXXXXXX)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_phone_colombia_format'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_colombia_format
    CHECK (phone IS NULL OR phone ~ '^\+57\d{10}$');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_farm_name TEXT;
  v_phone_raw TEXT;
  v_phone_digits TEXT;
  v_phone TEXT;
BEGIN
  v_farm_name := new.raw_user_meta_data ->> 'farm_name';
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

  -- Create organization if farm_name is provided
  IF v_farm_name IS NOT NULL AND v_farm_name != '' THEN
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
