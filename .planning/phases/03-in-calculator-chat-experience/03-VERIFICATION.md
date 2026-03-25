---
phase: 03-in-calculator-chat-experience
verified: 2026-03-25T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
human_verification:
  - test: "Open /dashboard/bioremediation with calculator fields unfilled, confirm the chat panel shows an amber warning and the composer is disabled."
    expected: "Panel visible, composer disabled, amber prompt to fill calculator fields."
    why_human: "Conditional UI rendering based on calculatorContext=null; cannot drive the browser state programmatically."
  - test: "Fill calculator fields, submit a question that has no matching approved cases, verify the response kind badge reads 'Escalar a Aquavet' and the rose CTA block is visible."
    expected: "Escalation rendered with 'Contacta al soporte técnico de Aquavet' copy and no fabricated recommendation."
    why_human: "Live AI response path; depends on the running backend and the current case library content."
  - test: "Submit a question with partial context that triggers a clarification, confirm the amber follow-up question block is displayed."
    expected: "ClarifyBody rendered with follow-up question in amber callout."
    why_human: "Depends on live AI response returning kind=clarify; not deterministic from static code analysis."
  - test: "After receiving an assistant answer, click Útil, confirm the thumbs-up button changes to 'Marcado como útil' and the API call succeeds."
    expected: "Feedback persisted, UI reflects confirmation, repeat clicks are prevented."
    why_human: "Requires a real authenticated Supabase session and a live message row in the database."
---

# Phase 3: In-Calculator Chat Experience Verification Report

**Phase Goal:** Deliver an in-calculator chat experience where producers can ask bioremediation dosage and troubleshooting questions without leaving the calculator workflow. The assistant automatically receives calculator context, asks clarifying questions when ambiguous, returns structured answers with recommendations/rationale/confidence/Aquavet citations, and explicitly escalates to human support when no safe grounded answer exists.

**Verified:** 2026-03-25
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A producer can access the assistant without leaving the current calculator route. | VERIFIED | `BioremediationChatPanel` imported and mounted in `components/bioremediation-form.tsx` line 484; the panel renders below the species reference table in the same route. |
| 2 | Every sent chat message automatically includes the active calculator context when available. | VERIFIED | `useBioremediationChat` is initialised with all live calculator fields (`selectedProduct`, `species`, `areaM2`, `depth`, `ageMonths`, `stockingDensity`, `aeration`, `result`); `buildCalculatorContext` serialises these into `CalculatorContext` which is sent in every `POST /api/bioremediation/chat` request body. |
| 3 | Clarifying questions are surfaced as a first-class part of the experience when context is missing. | VERIFIED | `ChatResponseKind = 'answer' | 'clarify' | 'escalate'` is handled in the hook; `ClarifyBody` in `bioremediation-chat-message.tsx` renders the follow-up question in a dedicated amber callout block; the panel also shows an amber guard when `calculatorContext` is null. |
| 4 | Assistant answers render as structured recommendation, rationale, confidence, and citations rather than opaque freeform text. | VERIFIED | `AnswerBody` renders labelled sections: Recomendación, Por qué, Casos Aquavet citados (citation cards with score/dose/outcome), Confianza percentage, and calculator guardrail note. |
| 5 | Escalation and low-confidence outcomes clearly route the producer to Aquavet support. | VERIFIED | `EscalateBody` renders a rose-coloured "Contacta al soporte técnico de Aquavet" block with next-step copy; `KindBadge` renders a distinct "Escalar a Aquavet" badge. |
| 6 | Each assistant answer supports basic usefulness feedback. | VERIFIED | `BioremediationChatFeedback` posts `{ messageId, feedback }` to `POST /api/bioremediation/chat/feedback`; the route is authenticated, validates the payload with Zod, enforces `role='assistant'` in the DB update, and is mounted via the children slot on every assistant message in the panel. |

**Score:** 6/6 truths verified

---

### Required Artifacts

#### Plan 01 artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `hooks/use-bioremediation-chat.ts` | Client-side session, send-state, and request orchestration for the calculator assistant | VERIFIED | 248 lines; exports `useBioremediationChat`, `ChatMessage`, `CalculatorContext`, `ChatResponseKind`, `ChatCitation`. Handles all three response kinds, session continuity, abort, error recovery. |
| `components/bioremediation-chat-panel.tsx` | Embedded calculator assistant shell | VERIFIED | 212 lines; renders message thread, ContextSummary, empty/loading/error states, textarea composer with Enter-to-send, and uses `BioremediationChatMessage` + `BioremediationChatFeedback`. |
| `components/bioremediation-form.tsx` | Integration point that keeps calculator and assistant in one workflow | VERIFIED | Imports `useBioremediationChat` and `BioremediationChatPanel`; passes all live calculator state as context; original "Calcular dosis" and "Guardar cálculo" CTAs preserved at lines 287 and 438. |

#### Plan 02 artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/bioremediation-chat-message.tsx` | Structured renderer for answer, clarify, and escalate states | VERIFIED | 229 lines; distinct `AnswerBody`, `ClarifyBody`, `EscalateBody` variants; KindBadge with three visual states; CitationCard sub-component; children slot for feedback composition. |
| `components/bioremediation-chat-feedback.tsx` | Per-answer usefulness controls | VERIFIED | 75 lines; renders "¿Fue útil esta respuesta?" row with ThumbsUp/ThumbsDown; posts to `/api/bioremediation/chat/feedback`; non-blocking on failure; prevents repeat clicks via `submitted` state. |
| `app/api/bioremediation/chat/feedback/route.ts` | Authenticated feedback endpoint tied to assistant messages | VERIFIED | 63 lines; Zod validates `messageId` (UUID) and `feedback` enum; session guard returns 401 if unauthenticated; DB update filters by `user_id` and `role='assistant'`; returns `{ ok: true }`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `hooks/use-bioremediation-chat.ts` | `app/api/bioremediation/chat/route.ts` | `fetch('/api/bioremediation/chat', { method: 'POST' })` | WIRED | Line 169 of the hook; response kinds mapped; session ID persisted across turns. |
| `components/bioremediation-form.tsx` | `hooks/use-bioremediation-chat.ts` | `useBioremediationChat({ selectedProduct, species, areaM2, depth, ageMonths, stockingDensity, aeration, result })` | WIRED | Lines 84–93 of form; full calculator state injected; `calculatorContext` and `sendMessage` forwarded to panel. |
| `components/bioremediation-chat-message.tsx` | `lib/bioremediation-chat/schema.ts` | `recommendation`, `rationale`, `confidence`, `citations` rendered directly from `ChatMessage` fields | WIRED | `ChatMessage` type imports these fields from the hook which maps them from the schema response. The schema defines `bioremediationChatResponseSchema` with all four fields; the route parses the service response through this schema before returning. |
| `components/bioremediation-chat-feedback.tsx` | `app/api/bioremediation/chat/feedback/route.ts` | `fetch('/api/bioremediation/chat/feedback', { method: 'POST' })` | WIRED | Line 23 of feedback component; payload `{ messageId, feedback }` matches Zod schema in the route. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `components/bioremediation-chat-panel.tsx` | `messages` | `useBioremediationChat` → `POST /api/bioremediation/chat` → `createBioremediationChatResponse` (Phase 2 service) | Yes — service queries Supabase `bioremediation_cases` for approved cases via the Phase 2 retrieval pipeline | FLOWING |
| `components/bioremediation-chat-panel.tsx` | `calculatorContext` | Live form state from `useBioremediation()` hook fields | Yes — bound to controlled inputs in the form | FLOWING |
| `components/bioremediation-chat-message.tsx` | `message.citations` | Mapped from `data.citations` in hook `sendMessage`; populated by Phase 2 retrieval service | Yes — Phase 2 retrieval queries approved cases | FLOWING |
| `app/api/bioremediation/chat/feedback/route.ts` | `feedback` column | `.update({ feedback }).eq('id', messageId).eq('role', 'assistant')` on `bioremediation_chat_messages` | Yes — real DB update; column added by `scripts/023_chat_message_feedback.sql` | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — the chat behavior requires a running server with an authenticated session and live AI responses. No runnable entry points can be safely tested without side effects. Human verification items cover the critical paths.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAT-01 | 03-01-PLAN.md | Producer can open a chatbot inside the existing bioremediation calculator workflow | SATISFIED | `BioremediationChatPanel` mounted inside `bioremediation-form.tsx`; same route `/dashboard/bioremediation`. |
| CHAT-02 | 03-01-PLAN.md | Producer can ask a punctual dosage or troubleshooting question using the active calculator context as grounding input | SATISFIED | `calculatorContext` serialised from live form fields and sent in every chat request; composer disabled when context is absent. |
| CHAT-03 | 03-01-PLAN.md | The chatbot can ask a narrow clarifying question when required context is missing or ambiguous | SATISFIED | `clarify` kind handled as first-class UI state with `ClarifyBody` rendering follow-up question. |
| CHAT-04 | 03-02-PLAN.md | The chatbot returns answers in a structured format that includes recommendation, rationale, confidence, and cited Aquavet case references | SATISFIED | `AnswerBody` in `bioremediation-chat-message.tsx` renders all four structured sections with labelled headings. |
| CHAT-05 | 03-02-PLAN.md | The chatbot can explicitly decline to answer and direct the producer to Aquavet support when no safe grounded answer exists | SATISFIED | `EscalateBody` renders with a rose "Contacta al soporte técnico de Aquavet" CTA and explicit next-step copy. |
| AUD-03 | 03-02-PLAN.md | Producer or Aquavet can capture basic feedback on chatbot usefulness to support future case-library improvement | SATISFIED | `BioremediationChatFeedback` + authenticated `POST /api/bioremediation/chat/feedback` + `scripts/023_chat_message_feedback.sql` column. |

**Orphaned requirements check:** No requirements assigned to Phase 3 in REQUIREMENTS.md are missing from the plan files. All six IDs claimed by the plans (CHAT-01 through CHAT-05 and AUD-03) are present in REQUIREMENTS.md and mapped to Phase 3 in the traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `hooks/use-bioremediation-chat.ts` | 65, 79 | `return null` | Info | Legitimate guard returns in `buildCalculatorContext` when form inputs are incomplete. The panel handles `calculatorContext === null` with an amber warning and disabled composer. Not a stub. |

No stubs, placeholders, TODO/FIXME markers, or hardcoded empty returns were found in any Phase 3 file. All `return null` occurrences are input validation guards, not hollow implementations.

---

### Human Verification Required

#### 1. No-context guard — composer disabled

**Test:** Open `/dashboard/bioremediation` without filling any calculator fields.
**Expected:** The chat panel is visible, the textarea composer is disabled, the amber "Completa los parámetros de la calculadora para que el asistente tenga contexto" warning is shown, and the Send button is disabled.
**Why human:** Depends on `calculatorContext === null` computed from live React state; cannot drive the browser in static analysis.

#### 2. Escalation path — no safe grounded answer

**Test:** Fill calculator fields and submit a question for a scenario unlikely to match any approved case (e.g. an exotic species not in the case library).
**Expected:** The response renders with the "Escalar a Aquavet" badge, `EscalateBody` with the rose CTA block, and no fabricated dosage recommendation.
**Why human:** Live AI response path; outcome depends on the running backend and current case library content.

#### 3. Clarification path — ambiguous question

**Test:** Submit a question without specifying a specific concern (e.g. "¿qué hago?") and observe the assistant response kind.
**Expected:** Response renders with the "Pregunta de aclaración" badge and an amber follow-up question block.
**Why human:** Depends on the AI model returning `kind=clarify`; not deterministic from static code analysis.

#### 4. Feedback persistence

**Test:** After receiving an assistant answer, click the "Útil" thumbs-up button and inspect the network tab for the `POST /api/bioremediation/chat/feedback` call.
**Expected:** 200 response with `{ ok: true }`, UI changes to "Marcado como útil", repeat clicks are prevented.
**Why human:** Requires a real authenticated Supabase session and a live message row with `role='assistant'` in the database.

---

### Gaps Summary

No gaps. All six must-haves from both plan files were verified at all four levels (existence, substance, wiring, and data flow). All five commits documented in the summaries exist in the git log. The existing "Calcular dosis" and "Guardar cálculo" calculator controls are preserved. The feedback SQL migration is present. No anti-patterns blocking the phase goal were found.

---

_Verified: 2026-03-25_
_Verifier: Claude (gsd-verifier)_
