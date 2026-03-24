DROP POLICY IF EXISTS "organizations_update_same_org" ON public.organizations;

CREATE POLICY "organizations_update_same_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );
