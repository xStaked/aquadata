---
phase: 03-in-calculator-chat-experience
plan: 02
subsystem: bioremediation-chat-ui
tags: [chat, message-renderer, feedback, escalation, structured-answers]
dependency_graph:
  requires:
    - 03-01-PLAN.md  # Chat hook, panel shell, and calculator integration
    - 02-01-PLAN.md  # bioremediation_chat_messages table for feedback persistence
  provides:
    - components/bioremediation-chat-message.tsx   # Structured renderer for answer, clarify, escalate
    - components/bioremediation-chat-feedback.tsx  # Per-answer útil / no útil controls
    - app/api/bioremediation/chat/feedback/route.ts # Authenticated feedback persistence route
    - scripts/023_chat_message_feedback.sql         # Adds feedback column to messages table
  affects:
    - components/bioremediation-chat-panel.tsx  # Updated to use new message component + feedback slot
tech_stack:
  added: []
  patterns:
    - Structured message renderer with distinct answer/clarify/escalate body variants
    - Feedback wired via children slot on BioremediationChatMessage (composable pattern)
    - Feedback route guards with user_id + role='assistant' to prevent cross-message writes
    - Non-blocking feedback: failures are silently swallowed, repeat clicks are idempotent
key_files:
  created:
    - components/bioremediation-chat-message.tsx
    - components/bioremediation-chat-feedback.tsx
    - app/api/bioremediation/chat/feedback/route.ts
    - scripts/023_chat_message_feedback.sql
  modified:
    - components/bioremediation-chat-panel.tsx
decisions:
  - Structured message renderer exposes a children slot so feedback renders outside the message bubble without coupling the two components
  - Feedback column added via a dedicated SQL migration rather than modifying 021_bioremediation_chat.sql so the migration chain stays clean
  - Feedback route enforces role='assistant' in the DB update so only assistant messages can receive feedback, regardless of what the client sends
  - EscalateBody includes an explicit Aquavet contact CTA so producers know the next step when the system cannot ground an answer
metrics:
  duration: 3min
  completed: "2026-03-25"
  tasks_completed: 2
  files_changed: 5
---

# Phase 3 Plan 2: Structured Answer Rendering and Usefulness Feedback Summary

Structured assistant message renderer with distinct answer, clarify, and escalate variants plus a lightweight per-answer útil / no útil feedback loop persisted against the Phase 2 message records.

## What Was Built

### Task 1 — Structured message renderer (`components/bioremediation-chat-message.tsx`)

A dedicated client component that replaces the inline `AssistantMessage` from the chat panel. Each response kind gets its own body:

- **AnswerBody**: renders labeled sections for Recomendación, Por qué (rationale), Casos Aquavet citados (citation cards with coincidence score, dose, and outcome), Confianza percentage, and a calculator guardrail note — making the answer scannable rather than a single paragraph.
- **ClarifyBody**: renders the clarification text plus a follow-up question in an amber callout, with a note that more context enables better grounded retrieval.
- **EscalateBody**: renders the explanation, rationale, and a rose-colored Contacta al soporte técnico de Aquavet block with next-step copy for the producer, plus the calculator guardrail.

The component accepts a `children` prop so the feedback controls compose naturally without internal coupling.

The panel's `AssistantMessage` inline render was replaced with `BioremediationChatMessage`.

### Task 2 — Feedback component and route

`components/bioremediation-chat-feedback.tsx` renders a minimal "¿Fue útil esta respuesta?" row with ThumbsUp/ThumbsDown buttons. On selection it calls `POST /api/bioremediation/chat/feedback` and shows a confirmation text. Failures are non-blocking (silently absorbed). Repeat clicks are prevented via the `submitted` state.

`app/api/bioremediation/chat/feedback/route.ts` is an authenticated route that validates the payload (messageId UUID + feedback enum), verifies the session, and calls a scoped Supabase UPDATE enforcing `user_id = auth.uid()` and `role = 'assistant'`. The feedback column was added via `scripts/023_chat_message_feedback.sql` (nullable TEXT CHECK).

The feedback component is mounted inside the `BioremediationChatMessage` children slot in the panel, rendering below the message bubble for each assistant reply.

## Deviations from Plan

### Auto-added: SQL migration for feedback column

**Rule 2 - Missing critical functionality**

- **Found during:** Task 2
- **Issue:** The plan says "Persist feedback against the assistant message record" but the `bioremediation_chat_messages` table has no `feedback` column.
- **Fix:** Added `scripts/023_chat_message_feedback.sql` with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (...)` before creating the feedback route.
- **Files modified:** `scripts/023_chat_message_feedback.sql`
- **Commit:** 8bc56e4

## Known Stubs

None — all feedback controls are wired to the live route. The feedback column defaults to NULL (no opinion) which is the correct initial state.

## Self-Check

### Files created/modified:

- [x] `components/bioremediation-chat-message.tsx` — FOUND
- [x] `components/bioremediation-chat-feedback.tsx` — FOUND
- [x] `app/api/bioremediation/chat/feedback/route.ts` — FOUND
- [x] `scripts/023_chat_message_feedback.sql` — FOUND
- [x] `components/bioremediation-chat-panel.tsx` — FOUND (modified)

### Commits:

- [x] ef96c7c — feat(03-02): create structured assistant message renderer
- [x] 8bc56e4 — feat(03-02): add per-answer usefulness feedback

## Self-Check: PASSED
