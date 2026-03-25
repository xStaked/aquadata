# Phase 3: In-Calculator Chat Experience - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 embeds the bioremediation assistant into the existing calculator workflow so producers can ask punctual dosage and troubleshooting questions without leaving the calculator. This phase focuses on the user experience, structured answer rendering, clarifying-question flow, citations, and lightweight usefulness feedback. It assumes the secure backend from Phase 2 exists and does not re-open provider, retrieval, or audit-backbone decisions.

</domain>

<decisions>
## Implementation Decisions

### Placement and interaction
- **D-01:** The assistant must live directly inside the current calculator flow at `app/dashboard/bioremediation/page.tsx`, not as a separate page or modal-only experience.
- **D-02:** The calculator remains the primary task; the chat UI should feel like a contextual side section or follow-on panel, not a replacement for the existing form and result card.

### Assistant behavior
- **D-03:** Every user message should automatically include the active calculator context when available so the producer does not have to restate product, species, or dose inputs.
- **D-04:** When safe grounding is missing, the assistant should ask one narrow clarifying question or explicitly escalate, instead of guessing.
- **D-05:** Structured answers must visibly include recommendation, rationale, confidence, and cited Aquavet cases.

### Feedback and scope
- **D-06:** The experience should support simple usefulness feedback from the producer after an assistant answer.
- **D-07:** The UI must keep reminding the user that the deterministic calculator output remains the authoritative numeric recommendation.

### the agent's Discretion
- UI layout details, empty states, and message grouping can follow existing card-first dashboard patterns as long as the calculator remains visually dominant.
- Streaming is optional; a single request-response interaction is acceptable if it keeps the implementation simpler and clearer.
- The chat history may start with the current calculator session only; broader reuse of prior saved calculations stays out of scope.

</decisions>

<specifics>
## Specific Ideas

- The current calculator already has a natural insertion point after the result card in `components/bioremediation-form.tsx`.
- The most important user jobs are dosage clarification and case-grounded troubleshooting, not general conversation.
- The answer UI should cite the underlying governed cases in a way that makes the origin obvious to the producer.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- `.planning/ROADMAP.md` — Phase 3 goal, dependency on Phase 2, and success criteria.
- `.planning/REQUIREMENTS.md` — `CHAT-01` through `CHAT-05` and `AUD-03`.
- `.planning/PROJECT.md` — Brownfield and scope constraints.
- `.planning/STATE.md` — Current project focus and confidence-threshold concern that affects clarify/escalate UX.

### Upstream backend dependency
- `.planning/phases/02-secure-retrieval-and-audit-backbone/02-CONTEXT.md` — Locked Phase 2 decisions the UI must respect.
- `.planning/phases/02-secure-retrieval-and-audit-backbone/02-RESEARCH.md` — Backend response-contract assumptions.
- `.planning/phases/02-secure-retrieval-and-audit-backbone/02-01-PLAN.md` — Persistence and shared schema assumptions.
- `.planning/phases/02-secure-retrieval-and-audit-backbone/02-02-PLAN.md` — Protected route and service contract assumptions.

### Current calculator UX
- `app/dashboard/bioremediation/page.tsx` — Route shell for the calculator.
- `components/bioremediation-form.tsx` — Existing calculator structure and the best insertion point for the assistant.
- `hooks/use-bioremediation.ts` — Current calculator state and deterministic result contract.
- `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/separator.tsx` — Existing UI primitives to preserve visual continuity.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/bioremediation-form.tsx` already organizes the workflow into steps and exposes a result section with room for a contextual assistant card below it.
- `hooks/use-bioremediation.ts` already holds the exact context the chat should inherit automatically.
- The repo has enough shadcn-style primitives to build a bounded chat panel without importing another UI framework.

### Established Patterns
- Dashboard surfaces in this repo are card-first and Spanish-first.
- Client-side interactivity is usually kept in a focused hook or small client component rather than a monolithic page.
- Existing forms preserve deterministic calculations visibly before adding secondary actions like saving.

### Integration Points
- Phase 3 should serialize the active calculator state into the Phase 2 route request whenever the user sends a chat question.
- The UI should surface citations and feedback using the structured response contract from Phase 2 rather than parsing freeform text.
- Feedback capture should attach to assistant messages, not to the whole page, so useful answers can be marked precisely.

</code_context>

<deferred>
## Deferred Ideas

- Multi-turn memory across historical calculations.
- Image-based troubleshooting or OCR inputs in chat.
- Rich “best match” explanation panels or more advanced similarity visualizations.

</deferred>

---

*Phase: 03-in-calculator-chat-experience*
*Context gathered: 2026-03-24*
