CREATE OR REPLACE FUNCTION public.set_bioremediation_chat_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.bioremediation_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calculator_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_deterministic_dose_g NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bioremediation_chat_sessions_user_idx
  ON public.bioremediation_chat_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bioremediation_chat_sessions_org_idx
  ON public.bioremediation_chat_sessions (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bioremediation_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.bioremediation_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  response_kind TEXT CHECK (response_kind IN ('answer', 'clarify', 'escalate')),
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  cited_case_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  calculator_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  low_confidence BOOLEAN NOT NULL DEFAULT false,
  requires_escalation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bioremediation_chat_messages_session_idx
  ON public.bioremediation_chat_messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS bioremediation_chat_messages_org_idx
  ON public.bioremediation_chat_messages (organization_id, created_at DESC);

ALTER TABLE public.bioremediation_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioremediation_chat_messages ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS bioremediation_chat_sessions_set_updated_at
  ON public.bioremediation_chat_sessions;
CREATE TRIGGER bioremediation_chat_sessions_set_updated_at
  BEFORE UPDATE ON public.bioremediation_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bioremediation_chat_updated_at();

DROP POLICY IF EXISTS "bioremediation_chat_sessions_select_own_org" ON public.bioremediation_chat_sessions;
CREATE POLICY "bioremediation_chat_sessions_select_own_org" ON public.bioremediation_chat_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bioremediation_chat_sessions_insert_own_org" ON public.bioremediation_chat_sessions;
CREATE POLICY "bioremediation_chat_sessions_insert_own_org" ON public.bioremediation_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bioremediation_chat_sessions_update_own_org" ON public.bioremediation_chat_sessions;
CREATE POLICY "bioremediation_chat_sessions_update_own_org" ON public.bioremediation_chat_sessions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bioremediation_chat_messages_select_session_scope" ON public.bioremediation_chat_messages;
CREATE POLICY "bioremediation_chat_messages_select_session_scope" ON public.bioremediation_chat_messages
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT sessions.id
      FROM public.bioremediation_chat_sessions AS sessions
      WHERE sessions.user_id = auth.uid()
        AND sessions.organization_id IN (
          SELECT profiles.organization_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
    )
    AND user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bioremediation_chat_messages_insert_session_scope" ON public.bioremediation_chat_messages;
CREATE POLICY "bioremediation_chat_messages_insert_session_scope" ON public.bioremediation_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT sessions.id
      FROM public.bioremediation_chat_sessions AS sessions
      WHERE sessions.id = bioremediation_chat_messages.session_id
        AND sessions.user_id = auth.uid()
        AND sessions.organization_id IN (
          SELECT profiles.organization_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
    )
    AND user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bioremediation_chat_messages_update_session_scope" ON public.bioremediation_chat_messages;
CREATE POLICY "bioremediation_chat_messages_update_session_scope" ON public.bioremediation_chat_messages
  FOR UPDATE TO authenticated
  USING (
    session_id IN (
      SELECT sessions.id
      FROM public.bioremediation_chat_sessions AS sessions
      WHERE sessions.user_id = auth.uid()
        AND sessions.organization_id IN (
          SELECT profiles.organization_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
    )
    AND user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT sessions.id
      FROM public.bioremediation_chat_sessions AS sessions
      WHERE sessions.id = bioremediation_chat_messages.session_id
        AND sessions.user_id = auth.uid()
        AND sessions.organization_id IN (
          SELECT profiles.organization_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
    )
    AND user_id = auth.uid()
    AND organization_id IN (
      SELECT profiles.organization_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );
