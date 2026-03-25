-- Migration: Add producer read access to approved grounding-eligible bioremediation cases
-- Gap closure: scripts/020_case_library.sql only has admin_full_access_bioremediation_cases,
-- so producer traffic through lib/bioremediation-chat/retrieval.ts returns zero rows.
-- This policy allows any authenticated user to SELECT rows that are both approved and
-- marked as usable for grounding. It does not grant INSERT, UPDATE, or DELETE.

DROP POLICY IF EXISTS "producer_read_approved_grounding_cases" ON public.bioremediation_cases;

CREATE POLICY "producer_read_approved_grounding_cases"
  ON public.bioremediation_cases
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND status_usable_for_grounding = true
  );
