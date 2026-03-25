# Phase 3: In-Calculator Chat Experience - Research

**Researched:** 2026-03-24
**Domain:** Embedding a grounded bioremediation chat panel into the existing calculator
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- The assistant must live inside the existing calculator workflow.
- The calculator remains the primary task and visible numeric authority.
- Active calculator context should automatically inform every chat request.
- Missing evidence should result in a clarifying question or escalation, not a guess.
- Structured answers must show recommendation, rationale, confidence, and citations.
- Producers should be able to leave simple usefulness feedback.

### Deferred Ideas (OUT OF SCOPE)
- Multimodal chat.
- Historical memory across prior calculations.
- General-purpose assistant behavior outside the bioremediation calculator.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Open chat inside the existing calculator workflow | Embed a client chat panel beneath or beside the current result card |
| CHAT-02 | Ask dosage/troubleshooting questions with active calculator context | Reuse `useBioremediation()` state when sending messages |
| CHAT-03 | Ask clarifying questions when context is missing | Render structured `clarify` responses with focused follow-up prompts |
| CHAT-04 | Return structured answers with recommendation, rationale, confidence, and citations | Message renderer keyed off the Phase 2 response contract |
| CHAT-05 | Decline and direct producer to Aquavet support when no safe answer exists | Escalation card and message state |
| AUD-03 | Capture basic usefulness feedback | Per-answer thumbs up/down or useful/not useful action tied to stored messages |
</phase_requirements>

## Summary

Phase 3 should be planned as a thin UI layer over the Phase 2 route contract. The existing calculator component already has the right shape for that: step-based form, deterministic result card, and a save action. The cleanest user experience is to keep that calculator intact and append a contextual assistant card that becomes most useful after the user has a result, while still allowing pre-result questions when partial context exists.

The main UI risk is letting the assistant visually overpower the calculator. The plan should explicitly keep the deterministic result card first, then render the assistant panel as a secondary but integrated tool. Messages should not be generic chat bubbles only; assistant responses need structured sections for recommendation, rationale, confidence, and cited cases so producers can quickly judge whether to trust the guidance and when to escalate to Aquavet.

Feedback is easiest if it attaches to assistant messages, not the session. That keeps Phase 3 compatible with the Phase 2 audit tables and gives Aquavet a clearer loop for future case-library improvement.

**Primary recommendation:** Plan Phase 3 around one client-side chat hook, one embedded calculator assistant panel, and one structured message/feedback renderer that consumes the normalized Phase 2 response shape.

## Project Constraints

- Preserve the current calculator logic and layout hierarchy.
- Keep the UI Spanish-first.
- Reuse existing shadcn-style components and avoid bringing in a new chat framework.
- Do not move model logic into the browser.
- Treat the Phase 2 route contract as canonical.

## Architecture Patterns

### Pattern 1: Dedicated Client Hook for Chat State
**What:** A small `useBioremediationChat` hook owns draft text, send state, session ID, and message list.
**Why:** Keeps `components/bioremediation-form.tsx` from becoming a large mixed-responsibility client file.

### Pattern 2: Embedded Assistant Panel
**What:** Render the assistant as a sibling section to the existing result card.
**Why:** Meets `CHAT-01` while keeping the calculator primary.
**Suggested sections:**
- Intro / scope note
- Message list
- Composer
- Current calculator context summary

### Pattern 3: Structured Assistant Message Renderer
**What:** Render assistant messages with explicit fields instead of only markdown or plain text.
**Why:** The requirements already define a structured answer contract, and producers need scannable guidance.
**Suggested blocks:**
- `Recomendación`
- `Por qué`
- `Confianza`
- `Casos citados`
- `Siguiente paso` when clarification or escalation is required

### Pattern 4: Per-Answer Feedback Controls
**What:** Add a minimal useful / not useful action on assistant messages.
**Why:** Satisfies `AUD-03` with a simple, low-friction control and maps cleanly to stored message IDs.

### Anti-Patterns to Avoid
- Freeform assistant text with no visible structure.
- Replacing the result card with chat-first UI.
- Losing current calculator context on send.
- Requiring the user to navigate away from `/dashboard/bioremediation`.

## Recommended Plan Shape

1. Chat state and embedded panel
   Add the client hook and embed the assistant into the existing calculator component tree.
2. Structured message rendering and feedback
   Render answer / clarify / escalate states distinctly and wire in usefulness feedback.

---

*Phase: 03-in-calculator-chat-experience*
*Research completed: 2026-03-24*
