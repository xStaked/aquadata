# Technology Stack

**Project:** AquaVet Operations Platform
**Researched:** 2026-03-24
**Scope:** Incremental stack choices for a grounded bioremediation chatbot inside the existing calculator flow

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js App Router route handlers | existing `next@16.1.6` | Server-side chat endpoint, retrieval orchestration, audit writes | This repo is already a single deployable Next.js app. Route handlers are the lowest-friction place to keep prompts, retrieval, and safeguard logic off the client without introducing a second backend. | HIGH |
| Vercel AI SDK Core | existing `ai@6.x` | Text streaming, provider abstraction, tool-free orchestration | The app already depends on `ai`. Extending the current provider layer is materially simpler than adding LangChain/LlamaIndex. AI SDK is the standard TypeScript/Next fit for streamed chat in this shape of app. | HIGH |
| AI SDK React UI hooks | add version matching `ai@6.x` | Chat state and streaming UI in the calculator surface | This keeps the frontend aligned with the same SDK used on the server. It avoids hand-rolling message state and transport semantics for a feature that is fundamentally a streaming chat UI. | HIGH |
| Zod | existing `zod@3.x` | Request validation, structured answer contract, safeguard enforcement | The calculator already relies on TypeScript and Zod-style validation patterns. Reusing Zod for prompt inputs and model outputs is safer than trusting free-form text. | HIGH |

### Retrieval and Case Storage
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Postgres | existing `@supabase/supabase-js@2.x` / managed Postgres | Canonical storage for curated field cases, chat logs, feedback, and review state | The existing product already treats Supabase as the operational source of truth. Case knowledge should live next to the rest of the app’s controlled data, not in a detached AI store. | HIGH |
| `pgvector` extension in Supabase | managed extension | Semantic retrieval over case chunks | Standard grounded-chat stacks in Postgres-backed SaaS apps use vector search in-database when the corpus is modest and metadata-rich. This keeps retrieval local to the existing data model and avoids a second search service. | HIGH |
| PostgreSQL full-text search + hybrid ranking | built into Postgres / Supabase | Exact matching for product names, species, symptoms, zones, and dosage terms | Bioremediation questions are not purely semantic. Exact tokens like product names, species, and region terms matter, so hybrid search is materially safer than vector-only retrieval. | HIGH |
| SQL migrations in `scripts/` | existing repo pattern | Case tables, chunk tables, session tables, audit tables | This repo already evolves schema with SQL files. Reusing that pattern keeps rollout reviewable and consistent with the rest of the product. | HIGH |

### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Row Level Security | existing platform capability | Restrict who can read/edit curated cases, chat sessions, and internal notes | Grounded chat only works if case data has controlled visibility. RLS is the correct control plane here because the app already uses Supabase auth and role-aware surfaces. | HIGH |
| Server-side embedding job inside Next.js admin/server path | new pattern, no new platform | Generate/update embeddings when Aquavet creates or edits a case | For this brownfield scope, embeddings can be computed during case ingestion or re-index jobs without adding queues, workers, or Edge Functions. Keep the first implementation synchronous and explicit. | MEDIUM |
| Postgres-backed audit tables | new schema, no new service | Persist prompt inputs, retrieved case ids, answer class, escalation flags, and user feedback | Operational guidance needs reviewability. A plain audit table is more useful to this team than introducing a full observability vendor during the first chatbot increment. | HIGH |

### Supporting Libraries and Repo Additions
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `@ai-sdk/react` | match `ai@6.x` | `useChat`-style client state and streaming | Add when the calculator page gets an embedded chat panel. | HIGH |
| `@ai-sdk/google` | existing `3.x` | Generation model via existing provider factory | Keep if the team wants minimum provider churn and Gemini remains the active model for answer generation. | MEDIUM |
| `@ai-sdk/openai` | add latest compatible major only if needed | Embeddings and/or alternate generation provider through the same SDK family | Add only if the chosen embedding path is OpenAI-backed or the team wants a second generation provider without changing orchestration style. | MEDIUM |
| Existing Supabase SSR helpers | existing `@supabase/ssr@0.6.x` | Authenticated server access inside route handlers | Reuse for chat routes so conversation and retrieval writes inherit the existing auth model. | HIGH |

## Recommended Brownfield Pattern

Use this stack shape:

1. The calculator page keeps the current deterministic dose calculator as the primary source of numeric truth.
2. An embedded chat panel sends user questions plus the current calculator context to a new server route such as `app/api/bioremediation/chat/route.ts`.
3. The route validates input with Zod, builds metadata filters from known calculator state, retrieves relevant case chunks from Supabase using hybrid search, and streams the answer through the AI SDK.
4. The answer returns with explicit case citations, uncertainty, and an escalation flag when evidence is weak or the request falls outside supported dosing patterns.
5. The route writes the conversation turn, retrieved case ids, and safety metadata to Postgres for review.

This is the standard fit for a 2026 TypeScript SaaS that already runs on Next.js + Supabase: one app, one auth system, one operational database, server-side orchestration, and in-database retrieval.

## Data Model Additions

Add these tables instead of storing “knowledge” as loose prompt text:

- `bioremediation_cases`
  - One curated Aquavet case per reviewed field example.
  - Store structured metadata: issue, species, product, zone, aeration context, water indicators, treatment summary, dose, outcome, author, reviewer, reviewed status.
- `bioremediation_case_chunks`
  - Chunked narrative or normalized case segments for retrieval.
  - Store `embedding vector`, normalized text, chunk order, and denormalized filter columns.
- `bioremediation_chat_sessions`
  - Session metadata tied to user and organization.
- `bioremediation_chat_messages`
  - User and assistant turns, including citations and calculator snapshot.
- `bioremediation_chat_feedback`
  - Thumbs up/down, “needed human help”, and resolution notes.

Why this shape:
- Cases stay editable and reviewable by Aquavet.
- Retrieval works on both narrative similarity and exact operational metadata.
- Chat quality can be audited against the actual cases used to answer.

## Operational Safeguards

These are stack requirements, not optional product polish:

| Safeguard | Implementation | Why | Confidence |
|-----------|----------------|-----|------------|
| Calculator-first grounding | Always pass current calculator inputs as structured server-side context | Dose advice must be anchored to the user’s actual pond inputs, not just free-form chat text. | HIGH |
| Hybrid retrieval with hard metadata filters | Filter by product/species/zone/aeration where known before semantic ranking | Reduces plausible-sounding but wrong cross-case leakage. | HIGH |
| Structured answer contract | Force output fields like `answer`, `citations`, `confidence`, `escalate`, `safe_to_answer` | Prevents the UI from treating any fluent paragraph as a valid operational recommendation. | HIGH |
| Citation-only evidence policy | Assistant may only cite retrieved case ids and reviewed case summaries | Prevents hidden model knowledge from masquerading as Aquavet practice. | HIGH |
| Refusal/escalation path | If retrieval confidence is weak, answer with limits and recommend Aquavet follow-up | Wrong certainty is worse than no answer in this domain. | HIGH |
| Full server-side logging | Persist question, retrieval set, output classification, and feedback | Required for QA, tuning, and post-incident review. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Chat orchestration | `ai@6` + Next route handlers | LangChain or LlamaIndex | Adds another abstraction layer, another set of primitives, and another debugging surface without solving a problem this repo actually has. Brownfield cost is higher than benefit here. |
| Retrieval store | Supabase Postgres + `pgvector` + FTS | Pinecone / Weaviate / external vector DB | The corpus is curated, small-to-medium, metadata-heavy, and already belongs in Supabase. External vector infra is unnecessary operational overhead at this stage. |
| Knowledge source | Structured case tables | OpenAI File Search / opaque hosted knowledge store | This feature needs editable domain cases, metadata filters, RLS, and auditability. A hosted file-centric retrieval layer is a poor fit for operational case management. |
| Execution model | Focused grounded Q&A | Agentic multi-tool assistant | The request is punctual technical consultation inside a calculator, not an open-ended agent workflow. Agents increase failure modes and make guardrails harder. |
| Backend topology | Stay inside existing Next.js app | Separate AI microservice | Splitting services this early creates auth, deployment, and observability duplication for no clear payoff. |
| Ingestion pipeline | Explicit server-side case indexing | Event buses / queues / workers on day one | Useful later if Aquavet starts bulk-importing hundreds of cases, but premature for the first grounded chatbot slice. |

## What NOT to Introduce

- Do not add LangChain, LlamaIndex, or a second AI orchestration framework.
- Do not add a separate Python service for retrieval or prompt assembly.
- Do not move case knowledge into PDFs or markdown blobs as the primary storage model.
- Do not call models directly from the browser.
- Do not rely on vector-only retrieval for dosage questions.
- Do not ship without citations, refusal logic, and audit persistence.

## Installation

```bash
# Minimal incremental additions
pnpm add @ai-sdk/react

# Only if embeddings or alternate generation will use OpenAI through the same SDK family
pnpm add @ai-sdk/openai
```

Database changes:

```sql
-- enable vector search in Supabase Postgres
create extension if not exists vector;
```

## Sources

Official / primary sources:
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- AI SDK UI Chatbot docs: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- AI SDK Chatbot Message Persistence docs: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
- AI SDK 6 announcement: https://vercel.com/blog/ai-sdk-6
- Supabase `pgvector` docs: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase Hybrid Search docs: https://supabase.com/docs/guides/ai/hybrid-search
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenAI Structured Outputs guide: https://platform.openai.com/docs/guides/structured-outputs

Repo context used:
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/.planning/PROJECT.md`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/.planning/codebase/STACK.md`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/.planning/codebase/ARCHITECTURE.md`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/package.json`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/components/bioremediation-form.tsx`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/hooks/use-bioremediation.ts`
- `/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/lib/ai/provider.ts`
