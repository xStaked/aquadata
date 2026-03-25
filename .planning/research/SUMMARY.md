# Project Research Summary

**Project:** AquaVet Operations Platform
**Domain:** Case-grounded bioremediation assistant inside the existing calculator workflow
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is not a general chatbot project. It is a bounded decision-support feature embedded in the existing bioremediation calculator, where producers ask punctual dosage or troubleshooting questions and expect answers grounded in curated Aquavet field cases plus the current calculator state. The research consistently points to the same implementation shape experts use for this kind of product: keep deterministic dosing logic as the numeric authority, keep AI execution server-side, store governed domain knowledge in structured operational tables, and return cited answers with visible uncertainty and escalation when evidence is weak.

The recommended approach is a brownfield extension of the current Next.js + Supabase app, not a platform rewrite. Add a governed case library, authenticated chat route, retrieval/orchestration modules under `lib/bioremediation/`, admin case-management tooling, and append-only audit logging. Start with deterministic SQL and metadata filtering, then add hybrid search with `pgvector` when the case corpus justifies it. The first roadmap phase should therefore be case governance and data foundations, not chat UI.

The main risks are predictable and avoidable: unstructured case ingestion, retrieval that ignores product/species/org boundaries, polished answers that hide uncertainty, and shipping without an evaluation loop. Mitigation is equally clear from the research: enforce a structured case schema with lifecycle states, keep retrieval server-side with hard filters and RLS, separate calculator truth from generative explanation, expose citations and escalation paths in the UI, and gate rollout behind replayable evals and operational traces.

## Key Findings

### Recommended Stack

The stack recommendation is conservative by design: extend the existing app rather than introduce a second backend or orchestration framework. Next.js App Router route handlers are the correct server boundary for chat inference and audit writes, the existing `ai@6.x` footprint should remain the orchestration layer, and Supabase Postgres should remain the canonical store for curated cases, chat sessions, and review traces. Retrieval should begin with structured filters and exact matching, then layer in `pgvector` plus hybrid search when the corpus size and query ambiguity warrant it.

**Core technologies:**
- Next.js App Router route handlers: authenticated server boundary for chat, retrieval, and logging, with minimal brownfield friction.
- Vercel AI SDK `ai@6.x` plus `@ai-sdk/react`: shared server/client chat primitives without adding LangChain or a second orchestration model.
- Supabase Postgres with RLS: operational system of record for cases, sessions, messages, and safe tenant-aware access.
- PostgreSQL full-text search plus `pgvector`: hybrid retrieval so product names, species, units, and symptoms are not left to semantic similarity alone.
- Zod: typed request validation and structured response contracts for safe-to-answer, citations, confidence, and escalation flags.

### Expected Features

The product contract is narrow and high-trust. Table stakes are context-aware grounded answers, structured dosage/troubleshooting output, clarifying questions for missing inputs, explicit uncertainty, one-click escalation, and persisted answer snapshots tied to the active calculation. Differentiators come after that baseline works: best-match case panels, “applied to your pond” deltas, answer-mode splits, follow-up chips, and a feedback loop that converts unanswered questions into new curated cases.

**Must have (table stakes):**
- Calculator-aware answers that consume current product, pond, and production inputs automatically.
- Grounded answer cards with cited Aquavet cases, structured output, and visible confidence.
- Clarifying questions or refusal when required context is missing.
- Human escalation and saved audit snapshots for every grounded exchange.
- Fast embedded UX inside the calculator rather than a separate support module.

**Should have (competitive):**
- Best-match case panel with similarity cues explaining why evidence was selected.
- “Applied to your pond” explanation that bridges field case evidence to current calculator context.
- Admin-authored case templates with required fields and normalization rules.
- Suggested follow-up chips and answer-mode split for dosage vs troubleshooting.
- Admin feedback loop on unanswered or low-confidence questions.

**Defer (v2+):**
- Reuse of historical calculations as reusable context memory.
- Broad conversational memory across sessions.
- Multimodal inputs such as image or voice support.
- Any general-purpose farm-management assistant behavior beyond bioremediation scope.

### Architecture Approach

The architecture research is the strongest and most opinionated input: keep a single Next.js App Router application backed by Supabase, add a dedicated `lib/bioremediation/` server slice for retrieval/prompting/auth/logging, use route handlers for producer chat inference, and use server actions for admin case CRUD. Do not place retrieval or prompt logic in `hooks/use-bioremediation`, do not call models from the browser, and do not create a microservice just to host the chatbot.

**Major components:**
1. Producer calculator + chat shell on `/app/dashboard/bioremediation/page.tsx` with chat as UX only, not business logic.
2. Server chat boundary at `/app/api/bioremediation/chat/route.ts` for auth, validation, retrieval, model invocation, and persistence.
3. Shared server domain modules under `lib/bioremediation/` for repositories, retrieval, prompt assembly, authorization, and audit logic.
4. Admin case-management surface under `/app/admin/bioremediation/cases` using Server Actions and admin role guards.
5. Supabase tables and RLS policies for governed case content, chat sessions/messages, and feedback or review traces.

### Critical Pitfalls

The biggest failure modes are governance and trust failures, not model-choice failures. The research repeatedly warns that the team can build something that looks polished while still being unsafe if the case library is loose, retrieval is weakly scoped, or uncertainty is hidden.

1. **Ungoverned case content** — avoid freeform anecdote ingestion; require structured fields, approval states, last-reviewed dates, retirement, and owner assignment before cases are retrievable.
2. **Weak retrieval scoping** — enforce org/product/species/status filters server-side before any semantic ranking; never let the browser fetch or assemble grounded context.
3. **Hidden uncertainty** — show citations, applicability notes, and explicit refusal/escalation states instead of always answering fluently.
4. **No eval loop** — build a gold-set of dosage, troubleshooting, ambiguous, and out-of-scope prompts before rollout; replay it on prompt, model, or case-library changes.
5. **Two sources of dosing truth** — keep numeric authority in the deterministic calculator and treat chat as explanation, contextualization, and escalation unless a case-backed deviation is explicit and auditable.

## Implications for Roadmap

Based on the combined research, the roadmap should be structured around governance, server boundaries, trust UX, and operations. UI work is downstream of case quality and secure retrieval.

### Phase 1: Case Library and Governance
**Rationale:** Chat quality depends on governed case data; shipping UI before a structured case library creates immediate trust failure.
**Delivers:** Case schema, editorial workflow, approval states, lifecycle fields, normalization rules, and admin ownership model.
**Addresses:** Grounded responses, human trust, anti-feature avoidance around free-text ingestion.
**Avoids:** Ungoverned case content, stale/superseded cases, language normalization drift.

### Phase 2: Secure Retrieval and Backend Integration
**Rationale:** Once cases are governed, the next dependency is a safe server boundary that can retrieve the right evidence and preserve calculator authority.
**Delivers:** New Supabase tables and RLS, `lib/bioremediation/` service layer, authenticated chat route, audit persistence, deterministic retrieval, and optional hybrid search scaffolding.
**Uses:** Next.js route handlers, AI SDK, Zod, Supabase, Postgres FTS, `pgvector` where justified.
**Implements:** Producer chat API, server orchestration, append-only trace model, calculator-context injection.
**Avoids:** Client-direct AI calls, org/product leakage, duplicated dosing logic, overestimating provider abstraction.

### Phase 3: Trust UX and In-Product Controls
**Rationale:** After safe retrieval works, the user experience must make evidence, scope, and uncertainty legible enough to prevent over-trust.
**Delivers:** Embedded chat panel, structured answer cards, citations, confidence states, clarifying-question flows, escalation CTA, and admin preview/debug surfaces.
**Addresses:** Context-aware answers, structured output, explicit uncertainty, escalation, fast in-calculator workflow.
**Avoids:** Hidden uncertainty, broad “ask anything” positioning, dense calculator component sprawl.

### Phase 4: Evaluation, Rollout, and Operations
**Rationale:** This feature should not launch broadly on demo quality alone; operational gating is part of the product.
**Delivers:** Gold-set eval pack, rollout gates, transcript review process, monitoring, bad-answer feedback loop, retention policy, and incident playbooks.
**Addresses:** Auditability, admin feedback loop, safe expansion of supported question types.
**Avoids:** Quality judged by anecdotes, missing incident traces, silent regressions after prompt/model/content changes.

### Phase Ordering Rationale

- Governance comes first because retrieval quality is downstream of case quality, taxonomy, and lifecycle states.
- Secure server retrieval comes before UI polish because trust failures are caused more by wrong evidence selection than by rendering details.
- Trust UX comes after backend boundaries are real, otherwise the team will design around placeholder answers and invent false confidence signals.
- Evaluation and rollout deserve a dedicated phase because the current repo has weak quality gates and the research is explicit that demos are not enough here.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Case taxonomy and editorial governance need Aquavet-specific decisions on mandatory fields, approval ownership, and review cadence.
- **Phase 2:** Retrieval strategy needs implementation-level validation on when deterministic filtering is enough and when hybrid/vector search should be introduced.
- **Phase 4:** Evaluation design needs a concrete gold-set and rollout policy tailored to supported intents and risk tolerance.

Phases with standard patterns (skip research-phase):
- **Phase 2 application scaffolding:** Next.js route handlers, server actions, Zod validation, and Supabase RLS integration are well-documented patterns.
- **Phase 3 UI shell composition:** Embedding a chat panel into the existing dashboard surface is straightforward once answer states and APIs are defined.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strong fit to the current repo and backed by official Next.js, AI SDK, and Supabase guidance. |
| Features | MEDIUM | Product scope is clear, but some differentiators still depend on Aquavet-specific workflow validation. |
| Architecture | HIGH | Brownfield integration path is well grounded in the existing app structure and current platform constraints. |
| Pitfalls | MEDIUM-HIGH | Warnings are strongly supported by general grounded-assistant practice, with some aquaculture-specific nuance still inferred. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Case-governance specifics: mandatory fields, approver roles, and stale-case review cadence still need Aquavet operational decisions during planning.
- Retrieval threshold policy: confidence cutoffs for “answer vs clarify vs escalate” need explicit test cases before launch.
- Corpus scale assumption: hybrid/vector search is recommended, but the exact timing depends on real case-library size and metadata quality.
- Support scope contract: the exact list of supported troubleshooting intents should be frozen early so the assistant is not marketed as broader than the evidence base.

## Sources

### Primary (HIGH confidence)
- Next.js Route Handlers docs: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js Route Handler reference: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Server Actions docs: https://nextjs.org/docs/app/getting-started/updating-data
- Vercel AI SDK docs and AI SDK 6 announcement: https://ai-sdk.dev/docs/introduction and https://vercel.com/blog/ai-sdk-6
- Supabase `pgvector`, hybrid search, and RLS docs: https://supabase.com/docs/guides/database/extensions/pgvector , https://supabase.com/docs/guides/ai/hybrid-search , https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenAI guardrails, evals, retrieval, and structured outputs guidance: https://platform.openai.com/docs/guides/guardrails , https://platform.openai.com/docs/guides/evals , https://platform.openai.com/docs/guides/retrieval , https://platform.openai.com/docs/guides/structured-outputs

### Secondary (MEDIUM confidence)
- Anthropic guardrails and citations guidance: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails and https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-citations
- Microsoft Learn guidance on agentic retrieval, RAG, and security trimming: https://learn.microsoft.com/en-us/azure/search/search-agentic-retrieval-concept , https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview , https://learn.microsoft.com/azure/search/search-security-trimming-for-azure-search
- Google Cloud grounded generation overview: https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/overview

### Repo Context
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/PROJECT.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
