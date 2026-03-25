# Phase 2: Secure Retrieval and Audit Backbone - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 adds the server-side retrieval, audit, and model-invocation backbone for the bioremediation assistant. It must use the governed Aquavet case library as the only evidence source, keep producer sessions tenant-safe, and preserve the deterministic calculator as the numeric authority. It does not finish the chat UI inside the calculator; that user-facing experience belongs to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Model and provider boundary
- **D-01:** The dosage assistant for this phase should target DeepSeek as the text-generation provider.
- **D-02:** DeepSeek calls must stay server-side behind a repo-local adapter instead of being invoked directly from the browser.
- **D-03:** The existing `lib/ai/provider.ts` pattern may be extended, but the DeepSeek integration must remain isolated enough that provider changes later are a single-module edit.

### Grounding and safety
- **D-04:** Retrieval must use only approved Aquavet cases from the governed case library as grounding evidence.
- **D-05:** Retrieval must filter by structured calculator and case context before answer generation, with product and species as required filters whenever present.
- **D-06:** The assistant may explain or adapt the calculator result, but it must never replace the deterministic calculator output as the numeric source of truth.

### Audit and tenancy
- **D-07:** Every answer must store the related calculator context, cited case IDs, confidence state, and whether the answer escalated or was low confidence.
- **D-08:** Chat sessions and history must remain scoped to the authenticated producer organization and never expose another tenant's data or cases.

### the agent's Discretion
- Retrieval ranking heuristics beyond the required filters may stay pragmatic and rules-based in this phase.
- Prompt structure, confidence thresholds, and trace fields can be chosen during planning as long as they support clarify-vs-answer-vs-escalate behavior in Phase 3.
- The persistence model can use one session table plus one message table if that is the simplest way to keep audit and tenant isolation explicit.

</decisions>

<specifics>
## Specific Ideas

- The governed source of truth is the existing case-library feature rooted in `components/admin/case-library/*` and the `bioremediation_cases` table created in Phase 1.
- The calculator context that should travel with each chat request is the same context already captured in `hooks/use-bioremediation.ts`: product, species, area, depth, age, stocking density, aeration, and the deterministic calculated dose when available.
- The feature remains Spanish-first and tightly scoped to dosage and punctual troubleshooting inside bioremediation.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- `.planning/ROADMAP.md` — Phase 2 boundary, success criteria, and its dependency on governed case data.
- `.planning/REQUIREMENTS.md` — `SAFE-01` through `SAFE-05`, `AUD-01`, `AUD-02`, and `CHAT-06`.
- `.planning/PROJECT.md` — Brownfield constraints and the assistant's bounded product shape.
- `.planning/STATE.md` — Current project focus and open concerns about confidence thresholds.

### Governed knowledge source
- `.planning/phases/01-case-library-governance/01-CONTEXT.md` — Locked governance decisions for case eligibility.
- `app/admin/bioremediation/cases/page.tsx` — Current admin surface and wording around governed cases and grounding eligibility.
- `components/admin/case-library/case-table.tsx` — Existing fields and grounding eligibility signals exposed in the UI.
- `lib/case-library/schema.ts` — Shared case input contract that defines structured case fields.
- `lib/case-library/types.ts` — Shared case row and status types.
- `app/admin/bioremediation/cases/actions.ts` — Current write contract for governed case data.
- `scripts/020_case_library.sql` — Current case-library schema and grounding-eligibility rules.

### Calculator and auth integration points
- `app/dashboard/bioremediation/page.tsx` — Calculator route where the future assistant will live.
- `components/bioremediation-form.tsx` — Existing calculator UX and the visible numeric result that must remain authoritative.
- `hooks/use-bioremediation.ts` — Calculator state shape and deterministic dose logic to preserve.
- `lib/auth/roles.ts` — Auth helpers and existing tenant-aware role checks.
- `lib/supabase/server.ts` — Server-side Supabase access pattern for authenticated routes.

### Existing AI pattern
- `lib/ai/provider.ts` — Current provider abstraction and the cleanest place to evaluate a DeepSeek adapter boundary.
- `app/api/ocr/route.ts` — Existing server-side AI route pattern using the `ai` SDK.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hooks/use-bioremediation.ts` already normalizes the calculator inputs needed as chat grounding context.
- `lib/ai/provider.ts` already centralizes text and vision model selection, so Phase 2 should avoid scattering provider details through routes.
- `app/api/ocr/route.ts` is a proven server-side pattern for model invocation and Zod-shaped output.
- `requireAdminUser()` and the server Supabase helpers establish the repo's authenticated data-access style.

### Established Patterns
- Server writes and protected reads stay inside App Router server routes, server actions, or server components.
- Product copy is Spanish-first.
- Supabase tables and policies are introduced through numbered SQL scripts under `scripts/`.
- Brownfield work in this repo stays pragmatic and avoids creating parallel subsystems when a current module can be extended.

### Integration Points
- Phase 2 should introduce a dedicated server route for producer chat requests plus new persistence tables for sessions and messages.
- The retrieval helper should query `bioremediation_cases` with `status = 'approved'` and `status_usable_for_grounding = true`.
- The audit payload should include a serialized calculator snapshot so later reviews can reconstruct what the assistant saw.

</code_context>

<deferred>
## Deferred Ideas

- Rich in-chat UX, feedback controls, and citation cards inside the calculator surface.
- Multimodal troubleshooting, image uploads, or reuse of prior saved calculations across sessions.
- Admin debugging dashboards for escalations and retrieval traces beyond the minimal stored audit fields.

</deferred>

---

*Phase: 02-secure-retrieval-and-audit-backbone*
*Context gathered: 2026-03-24*
