-- Migration 026: Replace plain authorized WhatsApp phones with named contacts
-- and add sender traceability fields to uploads.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS authorized_whatsapp_contacts JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.organizations
SET authorized_whatsapp_contacts = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', CONCAT('Contacto ', phone_items.ordinality),
        'phone', phone_items.phone
      )
      ORDER BY phone_items.ordinality
    )
    FROM jsonb_array_elements_text(authorized_whatsapp_phones) WITH ORDINALITY AS phone_items(phone, ordinality)
  ),
  '[]'::jsonb
)
WHERE jsonb_array_length(authorized_whatsapp_contacts) = 0
  AND jsonb_array_length(authorized_whatsapp_phones) > 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_authorized_whatsapp_contacts_is_array'
  ) THEN
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_authorized_whatsapp_contacts_is_array
    CHECK (jsonb_typeof(authorized_whatsapp_contacts) = 'array');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_whatsapp_phone_unique
  ON public.profiles (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

ALTER TABLE public.uploads
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS sender_phone TEXT,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

UPDATE public.uploads
SET source = 'web'
WHERE source IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uploads_source_check'
  ) THEN
    ALTER TABLE public.uploads
    ADD CONSTRAINT uploads_source_check
    CHECK (source IN ('web', 'whatsapp'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uploads_whatsapp_message_id_unique
  ON public.uploads (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS authorized_whatsapp_phones;
