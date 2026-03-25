-- Add usefulness feedback column to bioremediation_chat_messages.
-- Values: NULL (no feedback), 'useful', 'not_useful'.
-- Only assistant messages should receive feedback, but the constraint is
-- enforced in the application layer and the feedback route RLS policy.

ALTER TABLE public.bioremediation_chat_messages
  ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('useful', 'not_useful'));
