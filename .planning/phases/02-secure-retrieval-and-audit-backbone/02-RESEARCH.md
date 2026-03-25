# Phase 2: Secure Retrieval and Audit Backbone - Research

**Researched:** 2026-03-24
**Domain:** Server-side DeepSeek grounding and audit storage for the bioremediation calculator
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use DeepSeek as the text-generation provider for the dosage assistant.
- Keep all model calls server-side behind a repo-local adapter.
- Ground answers only on approved Aquavet cases from the governed case library.
- Preserve the deterministic calculator as the visible numeric authority.
- Store calculator context, cited case IDs, confidence state, and escalation flags for every answer.
- Keep chat sessions tenant-safe for the authenticated producer organization.

### Deferred Ideas (OUT OF SCOPE)
- Calculator chat UI polish and feedback controls.
- Multimodal uploads or general-purpose farm chatbot behavior.
- Admin review queues and trace dashboards.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | Chat requests use an authenticated server-side route | App Router `route.ts` with Supabase-authenticated session lookup |
| SAFE-02 | Retrieval filters by structured context before ranking | Query helper keyed by product, species, zone, and approval status |
| SAFE-03 | Only approved Aquavet cases are cited | Hard DB filter on approved / grounding-eligible case rows |
| SAFE-04 | Store cited case IDs and confidence for every answer | Session and message persistence with trace fields |
| SAFE-05 | Prevent cross-tenant exposure | Session ownership check tied to authenticated user and organization |
| AUD-01 | Store session and message history with calculator context | Separate session + message tables or equivalent structured schema |
| AUD-02 | Store escalation / low-confidence state | Trace columns on assistant messages |
| CHAT-06 | Calculator remains numeric source of truth | Prompt contract and response schema that references but does not overwrite calculator outputs |
</phase_requirements>

## Summary

Phase 2 should be planned as a server-only capability with three concrete slices: persistence, retrieval, and answer orchestration. The repo already has the right building blocks for that shape: authenticated Supabase access, SQL migrations, a central AI provider module, and an existing App Router AI route. The low-risk path is to add explicit chat session/message tables, create a retrieval helper that reads only `bioremediation_cases` rows that are already approved for grounding, and expose a protected route that packages calculator context plus retrieved cases into a bounded DeepSeek prompt.

The key brownfield choice is where to place provider-specific code. `lib/ai/provider.ts` already centralizes model selection, but the repo does not yet expose DeepSeek. The safest plan is to add a small DeepSeek-oriented text adapter or extend the provider catalog with a dedicated DeepSeek branch while keeping request formatting and environment variables isolated in a single server module. That prevents the future route, retrieval helper, and Phase 3 UI from depending on provider-specific request shapes.

Audit storage should be first-class, not log-shaped. Storing session rows separately from message rows makes tenant checks, replay, and feedback additions in Phase 3 much easier. Each assistant message should persist the normalized calculator context snapshot, cited case IDs, confidence, and a simple outcome enum such as `answered`, `clarify`, or `escalate`.

**Primary recommendation:** Plan Phase 2 around one SQL migration for chat sessions/messages, one retrieval helper that enforces approved-case filters before ranking, one DeepSeek text adapter, and one authenticated `/api/bioremediation/chat` route that returns a structured response contract.

## Project Constraints

- Keep the solution inside the current Next.js 16 + Supabase app.
- Avoid browser-side model calls.
- Preserve Spanish-first product copy.
- Use ordered SQL scripts in `scripts/`.
- Follow the current repo pattern of typed Zod parsing around server entry points.
- Avoid replacing deterministic calculator logic with LLM-generated numbers.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `16.1.6` | Protected route handlers and server components | Already the app shell |
| Supabase SSR + JS | `0.6.1` / `2.49.1` | Authenticated DB access and RLS | Already the current backend pattern |
| `ai` | `^6.0.0` | Structured model invocation and output shaping | Already used in `app/api/ocr/route.ts` |
| Zod | `^3.24.1` | Request/response validation | Already part of the stack |

### Existing Repo Assets
| Asset | Purpose | When to Use |
|------|---------|-------------|
| `lib/ai/provider.ts` | Central model/provider selection | Extend or wrap for DeepSeek text calls |
| `app/api/ocr/route.ts` | Existing AI route example | Mirror server-only invocation and schema-first response handling |
| `hooks/use-bioremediation.ts` | Calculator context source | Reuse field names and value semantics for chat context |
| `scripts/020_case_library.sql` | Governed case-library schema | Base retrieval on its approved and grounding-eligible rows |

## Architecture Patterns

### Pattern 1: Session + Message Tables for Audit
**What:** Store one chat session row per calculator conversation and one row per user/assistant message.
**Why:** Keeps audit explicit, enables future feedback, and simplifies tenant checks.
**Recommended fields:**
- `bioremediation_chat_sessions`: `id`, `user_id`, `organization_id`, `calculator_context`, `last_calculated_dose_g`, `created_at`, `updated_at`
- `bioremediation_chat_messages`: `id`, `session_id`, `role`, `content`, `response_kind`, `confidence`, `cited_case_ids`, `calculator_context`, `low_confidence`, `requires_escalation`, `created_at`

### Pattern 2: Structured Retrieval Before Generation
**What:** Filter cases in SQL first, then do lightweight ranking in TypeScript.
**Why:** Meets `SAFE-02` and `SAFE-03` without depending on embeddings or a new vector subsystem.
**Recommended first-pass filters:**
- `status = 'approved'`
- `status_usable_for_grounding = true`
- exact or inclusive matches for `product_name`
- exact or inclusive matches for `species`
- optional zone matching when the question or calculator context provides a zone-like signal

### Pattern 3: Bounded Response Contract
**What:** The route should return one normalized shape for Phase 3 to render.
**Suggested response schema:**
- `kind`: `answer | clarify | escalate`
- `recommendation`
- `rationale`
- `confidence`
- `citations`
- `calculator_guardrail_note`

### Pattern 4: Provider Adapter Boundary
**What:** Keep DeepSeek request formatting inside one server-only module.
**Why:** The repo already has provider centralization; Phase 2 should not hardcode provider details in route handlers or UI hooks.

### Anti-Patterns to Avoid
- Direct model calls from the browser.
- Using draft or retired cases as evidence.
- Making the LLM compute the final dosage instead of referencing calculator output.
- Introducing vector search or cross-tenant shared transcripts before the grounded SQL path is working.
- Storing audit traces only in console logs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation | Ad hoc object checks | Zod schemas in a server module | Already the repo norm |
| Auth on chat route | Manual cookie parsing | Server Supabase client plus existing auth pattern | Consistent and safer |
| Retrieval engine | Embeddings subsystem now | SQL-first filtered retrieval plus deterministic ranking | Fastest bounded path |
| Provider sprawl | Inline `fetch` calls across files | One DeepSeek adapter module | Easier swaps and testing |

## Recommended Plan Shape

1. Persistence and contracts
   Create session/message tables plus shared schemas/types for calculator context, retrieval candidates, and route I/O.
2. Retrieval and answer pipeline
   Build the approved-case retrieval helper, DeepSeek adapter, and authenticated chat route with stored audit traces.

---

*Phase: 02-secure-retrieval-and-audit-backbone*
*Research completed: 2026-03-24*
