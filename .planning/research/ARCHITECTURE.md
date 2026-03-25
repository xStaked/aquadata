# Architecture Patterns

**Domain:** aquaculture operations app with a case-grounded bioremediation chatbot
**Researched:** 2026-03-24

## Recommended Architecture

Keep the product as a single Next.js App Router application backed by Supabase. Do not introduce a separate chatbot backend. The right extension is a new bioremediation domain slice inside the existing app:

- producer chat UI in the existing dashboard bioremediation surface
- admin case-management UI in the existing admin surface
- authenticated Route Handlers and Server Actions as the only write / AI execution boundary
- Supabase tables for curated cases, chat sessions, and chat messages
- shared server-side orchestration under `lib/bioremediation/` for retrieval, prompt assembly, authorization, and logging

That fits the current codebase shape better than embedding AI logic into the client hook or creating a disconnected microservice. The app already has the right primitives: protected layouts, server Supabase clients, admin role guards, SQL-first schema changes, and an existing AI provider abstraction.

### Proposed Brownfield Shape

```text
Producer Dashboard
  /app/dashboard/bioremediation/page.tsx
    -> renders calculator shell + chat panel
    -> uses client chat component for UX only
    -> calls authenticated Route Handler /api/bioremediation/chat
    -> optionally calls Server Actions for session rename / feedback / save

Admin Surface
  /app/admin/bioremediation/cases/page.tsx
    -> server-rendered list + filters
    -> case create/update/archive via Server Actions
    -> preview test panel can call same retrieval service in dry-run mode

Server Domain Layer
  /lib/bioremediation/
    case-repository.ts
    retrieval.ts
    prompt.ts
    chat-service.ts
    authorization.ts
    dto.ts

Persistence
  bioremediation_cases
  bioremediation_case_tags or JSONB taxonomy fields
  bioremediation_chat_sessions
  bioremediation_chat_messages
  optional bioremediation_case_revisions / audit trail
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `app/dashboard/bioremediation/page.tsx` | Server entrypoint for producer calculator + chat page, initial auth-safe data load | `lib/supabase/server`, server-rendered chat/session queries |
| `components/bioremediation-form.tsx` | Dose calculator UI only; no AI logic | `hooks/use-bioremediation`, save action or API for calc persistence |
| `components/bioremediation-chat.tsx` | Client chat UX, optimistic rendering, streaming consumption, source citation display | `/api/bioremediation/chat`, optional message feedback action |
| `app/api/bioremediation/chat/route.ts` | Authenticated chat request boundary; validates request, loads user context, runs retrieval + model call, stores transcript | `lib/bioremediation/chat-service`, `lib/supabase/server` |
| `lib/bioremediation/case-repository.ts` | Query curated cases and case metadata with org/product/issue filters | Supabase Postgres |
| `lib/bioremediation/retrieval.ts` | Build the case shortlist for a question using deterministic filters first, semantic ranking second if added later | `case-repository.ts` |
| `lib/bioremediation/prompt.ts` | Assemble system prompt, domain rules, selected cases, and response contract | `retrieval.ts` |
| `lib/bioremediation/chat-service.ts` | Orchestrates authorization, grounding, model invocation, persistence, and fallback behavior | AI provider factory, repository layer |
| `app/admin/bioremediation/cases/page.tsx` | Admin case library management surface | Server Actions, `requireAdminUser()` |
| `app/admin/bioremediation/cases/actions.ts` | Server-only case CRUD and publish/archive operations | `lib/supabase/server`, `requireAdminUser()` |
| Supabase RLS policies | Enforce producer/admin access boundaries at data layer | all table access |

### Data Model Boundaries

Use separate tables for distinct concerns. Do not overload `bioremediation_calcs`.

| Table | Purpose | Key Notes |
|-------|---------|-----------|
| `bioremediation_cases` | Curated Aquavet field cases used for grounding | admin-owned content; includes issue, zone, species, product, symptom summary, treatment, dose, outcome, confidence/status |
| `bioremediation_case_sources` or JSONB metadata | Optional structured evidence such as pond conditions, water metrics, notes, attachments | keep flexible but bounded |
| `bioremediation_chat_sessions` | One producer conversation thread | store `user_id`, `organization_id`, optional `pond_id`, title, last activity |
| `bioremediation_chat_messages` | Request/response transcript with cited case ids | append-only preferred |
| `bioremediation_case_feedback` | Optional admin review of bad answers / user feedback | useful for prompt and case quality iteration |

Recommended table ownership:

- cases are organization-aware but effectively global to Aquavet admins unless the business later requires region-specific visibility
- chat sessions/messages are tenant-scoped to the authenticated producer organization
- cited case IDs should be stored on assistant messages for auditability

## Data Flow

The key rule is simple: the browser never queries raw case knowledge directly and never calls the model directly.

### Producer Chat Flow

1. Authenticated producer opens `/dashboard/bioremediation`.
2. Server page loads calculator shell plus recent chat sessions owned by that user or organization.
3. Client chat component sends a request to `POST /api/bioremediation/chat` with:
   - session id or `null`
   - message text
   - optional calculator context
   - optional pond / species / product context
4. Route Handler creates a request-scoped server Supabase client and calls `supabase.auth.getUser()`.
5. Route Handler loads the producer profile and organization context.
6. `chat-service.ts` performs deterministic retrieval from `bioremediation_cases`:
   - filter by product if present
   - filter by species / issue / zone when available
   - prefer published and high-confidence cases
7. `prompt.ts` composes:
   - system rules
   - calculator context
   - normalized user question
   - selected cases
   - response schema requiring practical answer + cited cases + uncertainty
8. AI model is invoked through the existing provider abstraction.
9. Response is stored with cited case ids and request metadata.
10. Stream or return the answer to the client.
11. Client renders answer with case citations and a clear fallback when evidence is weak.

### Admin Case Ingestion Flow

1. Admin opens `/admin/bioremediation/cases`.
2. Server page loads cases via admin-safe server client.
3. Admin creates or edits a case through Server Actions, not client-direct Supabase writes.
4. Server Action validates structured fields:
   - issue
   - zone / region
   - species
   - product
   - triggering conditions
   - treatment approach
   - dose
   - outcome
   - internal notes
   - publish status
5. Action writes to `bioremediation_cases` and revalidates admin routes.
6. Only published cases become eligible for chatbot retrieval.

### Calculator + Chat Context Flow

The calculator should remain usable without chat. The chat should consume calculator state as optional context, not own the calculator.

Recommended interaction:

- user calculates a dose in the existing form
- form exposes a normalized summary object
- chat panel can inject that summary into the next prompt as structured context
- persisted calculations remain separate from chat sessions, but a chat message may reference a calc id when relevant

This preserves the current calculator behavior and avoids turning one dense client component into the system’s domain core.

## Patterns to Follow

### Pattern 1: Route Handler for conversational requests
**What:** Use authenticated Route Handlers for chat inference because the request is not a plain form mutation and may need streaming.
**When:** For message send, response stream, and retrieval-backed inference.
**Example:**

```typescript
// app/api/bioremediation/chat/route.ts
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { runBioremediationChat } from '@/lib/bioremediation/chat-service'

const requestSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  message: z.string().min(1).max(2000),
  pondId: z.string().uuid().nullable().optional(),
  calculatorContext: z.object({
    product: z.string(),
    areaM2: z.number(),
    depth: z.number(),
    finalDoseG: z.number(),
  }).nullable().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const input = requestSchema.parse(await req.json())
  return runBioremediationChat({ supabase, userId: user.id, input })
}
```

Why here:
- matches the existing OCR pattern
- keeps provider keys and case knowledge off the client
- clean place for request validation and auth checks

### Pattern 2: Server Actions for admin case CRUD
**What:** Use `"use server"` actions for case creation, updates, publish/archive, and lightweight admin mutations.
**When:** Admin-only forms in the existing admin surface.
**Example:**

```typescript
'use server'

import { requireAdminUser } from '@/lib/auth/roles'

export async function createBioremediationCase(formData: FormData) {
  const { supabase } = await requireAdminUser()
  // validate, insert, revalidate
}
```

Why here:
- aligns with current admin mutation pattern
- avoids browser writes for sensitive knowledge-base content
- keeps cache invalidation straightforward

### Pattern 3: Deterministic retrieval first
**What:** Start with SQL-filtered retrieval from structured case fields before adding embeddings.
**When:** Initial rollout of a small or medium curated case library.
**Example:**

```typescript
const cases = await repo.searchPublishedCases({
  product,
  species,
  issue,
  zone,
  limit: 5,
})
```

Why:
- Aquavet knowledge is operational and structured
- easier to debug than vector-only ranking
- avoids adding another subsystem before the case library proves large enough to need semantic search

### Pattern 4: Append-only chat audit trail
**What:** Store each user and assistant message with request metadata and cited case ids.
**When:** Every production chat exchange.
**Why:**
- dosage guidance is operationally sensitive
- supports review of bad answers
- enables later analytics without reconstructing prompts from logs

## Brownfield Integration Points

| Existing Brownfield Point | Keep / Change | Integration Decision |
|---------------------------|---------------|----------------------|
| `app/dashboard/bioremediation/page.tsx` | Keep | Expand into calculator + chat shell rather than creating a separate producer module |
| `components/bioremediation-form.tsx` | Change slightly | Keep as calculator UI, but remove any future temptation to place chat business logic inside it |
| `hooks/use-bioremediation.ts` | Refactor | Keep dose calculation pure helpers; move persistence to a server-side mutation boundary |
| `app/api/ocr/route.ts` | Reuse pattern | Mirror this route-based AI integration style for chat |
| `lib/ai/provider.ts` | Extend | Add a chat-facing accessor or provider config, do not bypass this abstraction |
| `lib/auth/roles.ts` and `requireAdminUser()` | Reuse | Use for admin case-management routes and actions |
| current Supabase org/RLS model | Reuse and extend | Add policies for case visibility and chat ownership; do not introduce service-role browser access |
| `app/admin/bioremediation/page.tsx` | Extend | Add a case-library child route or adjacent section under the existing bioremediation admin area |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-direct AI calls
**What:** Calling the model from the browser or exposing model credentials indirectly.
**Why bad:** breaks security, weakens auditability, and bypasses tenant-aware retrieval.
**Instead:** always route through authenticated server code.

### Anti-Pattern 2: Putting retrieval and prompt assembly inside `use-bioremediation`
**What:** Expanding the current calculator hook into a combined calculator/chat domain layer.
**Why bad:** it already mixes UI state and persistence; adding chat orchestration would make the component boundary worse.
**Instead:** create `lib/bioremediation/*` server modules and keep the hook focused on calculator state.

### Anti-Pattern 3: Storing cases as unstructured prompt text only
**What:** A single giant blob of case notes.
**Why bad:** poor filtering, poor admin editing, poor explainability.
**Instead:** store structured fields plus freeform notes.

### Anti-Pattern 4: Service-role shortcuts for tenant data fetches
**What:** using a service role broadly to simplify cross-table access.
**Why bad:** easy to violate org isolation and contradict the current RLS-first model.
**Instead:** use signed-in user context wherever possible and reserve elevated access for tightly bounded admin-only server code if ever needed.

## Secure Request Handling

Security requirements for this feature are stricter than the current calculator because answer quality and tenant isolation both matter.

### Required controls

- authenticate every chat request with the server Supabase client
- derive organization context server-side from `profiles`, never from a client-supplied org id
- validate all request payloads with Zod before retrieval or model invocation
- keep case retrieval on the server and behind RLS / admin publish status
- store only the minimum farm context needed for the answer
- do not expose unpublished admin notes to producer-facing prompts
- return explicit uncertainty when no strong case match exists

### Suggested policy split

- `bioremediation_cases`
  - admin: full CRUD
  - producers: no direct table access, or read-only access only to published/sanitized rows if needed for server queries under user context
- `bioremediation_chat_sessions`
  - producer: select/insert/update only own or same-org sessions according to desired sharing model
  - admin: read access only if support-review is an explicit business requirement
- `bioremediation_chat_messages`
  - same model as sessions

### Prompt hygiene

- separate internal case notes from producer-safe summary fields
- include response constraints that forbid fabricating doses not supported by cited cases
- require the assistant to say when it is extrapolating from a similar case rather than an exact match

## Suggested Build Order

Build order matters because the current codebase lacks a strong domain-service boundary.

1. **Schema and RLS foundation**
   - add case, session, and message tables
   - add publish/status fields and audit-friendly columns
   - add RLS policies first

2. **Server domain slice**
   - create `lib/bioremediation/` modules
   - implement case repository, retrieval, prompt builder, chat service
   - extend `lib/ai/provider.ts` only as needed

3. **Admin case management**
   - add `/admin/bioremediation/cases`
   - implement create/edit/publish/archive flows with Server Actions
   - this should exist before producer chat rollout so the knowledge base is curated first

4. **Producer chat API**
   - add `/api/bioremediation/chat`
   - persist sessions/messages
   - enforce auth and request validation

5. **Producer UI integration**
   - add chat panel to `/dashboard/bioremediation`
   - pass calculator context optionally
   - keep calculator independently functional

6. **Refactor calculator persistence**
   - move `handleSave()` write path out of the client hook and into a server-side mutation boundary
   - this is not strictly required for first chat delivery, but it reduces architectural inconsistency

7. **Operational review tooling**
   - add feedback, bad-answer reporting, and admin transcript review if needed

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Case retrieval | SQL filters and ordering are sufficient | add indexes on status, product, species, zone, issue | likely add embeddings or hybrid search if case library and query volume expand materially |
| Chat persistence | single Postgres tables fine | paginate sessions/messages and archive old payload metadata | move long-term analytics to separate reporting pipeline |
| AI latency | synchronous request acceptable | stream responses to keep UX responsive | require tighter quotas, caching, and async review workflows |
| Admin curation | manual case entry manageable | need stronger validation taxonomy and duplicate detection | require editorial workflow, QA, and content governance |

## Build Implications For Roadmap

- The first roadmap phase should not be "chat UI". It should be "knowledge base and secure server boundary".
- Admin case curation must precede or ship with producer chat, otherwise the assistant has nothing trustworthy to ground on.
- Refactoring the calculator’s client-direct persistence is a useful adjacent task because it establishes the same server-side mutation boundary the chatbot needs.
- This feature is a domain-slice addition, not a platform rewrite. Phase plans should preserve the current single-app deployment model.

## Sources

- Existing project planning and codebase documents:
  - `.planning/PROJECT.md`
  - `.planning/codebase/ARCHITECTURE.md`
  - `.planning/codebase/STACK.md`
  - `.planning/codebase/CONCERNS.md`
- Brownfield code references:
  - `app/dashboard/bioremediation/page.tsx`
  - `components/bioremediation-form.tsx`
  - `hooks/use-bioremediation.ts`
  - `app/api/ocr/route.ts`
  - `lib/ai/provider.ts`
  - `lib/auth/roles.ts`
  - `app/admin/bioremediation/page.tsx`
  - `scripts/001_create_schema.sql`
  - `scripts/010_admin_module.sql`
- Official docs:
  - Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
  - Next.js Server Functions / Server Actions: https://nextjs.org/docs/app/getting-started/updating-data
  - Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
  - Vercel AI SDK Introduction: https://ai-sdk.dev/docs/introduction

## Confidence

**Overall confidence:** HIGH

Reasoning:
- HIGH on brownfield integration points because they are based on the current repository structure and existing files
- HIGH on request-boundary recommendations because they align with current Next.js and Supabase patterns from official docs
- MEDIUM on long-term retrieval scaling because the eventual need for hybrid/vector search depends on future case-library size and query complexity
