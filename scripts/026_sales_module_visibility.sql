ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS sales_module_enabled BOOLEAN NOT NULL DEFAULT TRUE;
