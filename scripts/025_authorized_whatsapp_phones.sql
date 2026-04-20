-- Migration 025: Add organization-level authorized WhatsApp phones
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS authorized_whatsapp_phones JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_authorized_whatsapp_phones_is_array'
  ) THEN
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_authorized_whatsapp_phones_is_array
    CHECK (jsonb_typeof(authorized_whatsapp_phones) = 'array');
  END IF;
END
$$;
