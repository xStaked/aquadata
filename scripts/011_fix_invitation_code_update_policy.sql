-- Fix invitation code update policy so signup can transition a code
-- from used = false to used = true.

DROP POLICY IF EXISTS "Public can mark code as used" ON public.invitation_codes;

CREATE POLICY "Public can mark code as used" ON public.invitation_codes
  FOR UPDATE
  USING (used = false)
  WITH CHECK (used = true);
