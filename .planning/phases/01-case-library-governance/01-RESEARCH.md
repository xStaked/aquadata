# Phase 1: Case Library Governance - Research

**Researched:** 2026-03-24
**Domain:** Next.js 16 admin CRUD on Supabase with governed case-library data
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Governance ownership
- **D-01:** Any user with the existing `admin` role can move a case between `draft`, `approved`, and `retired`.
- **D-02:** Phase 1 should not introduce a stricter approver-only role or author-vs-reviewer separation for publication state changes.

### Review metadata
- **D-03:** Phase 1 stores only the latest reviewer metadata for the current case state.
- **D-04:** Phase 1 does not need a status-transition history log; broader audit-trace behavior belongs to later phases.

### the agent's Discretion
- Case content shape beyond the required fields in roadmap and requirements should stay pragmatic and structured-first.
- Admin workflow shape can follow established admin patterns in the repo: server-rendered list page with lightweight create/edit interactions.
- Default table columns, filters, and review-date semantics may be decided during planning as long as they support efficient case governance from the current admin surface.

### Claude's Discretion
- Case content shape beyond the required fields in roadmap and requirements should stay pragmatic and structured-first.
- Admin workflow shape can follow established admin patterns in the repo: server-rendered list page with lightweight create/edit interactions.
- Default table columns, filters, and review-date semantics may be decided during planning as long as they support efficient case governance from the current admin surface.

### Deferred Ideas (OUT OF SCOPE)
- Approver-only permissions or author-cannot-self-approve rules.
- Status-transition audit history for each case.
- Retrieval, citation, and chat-serving concerns, which belong to later phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CASE-01 | Aquavet admin can create a structured bioremediation case with required fields for issue, zone, species, product, treatment approach, dose, outcome, and status | Structured SQL schema, Zod form schema, and admin create flow via Server Actions |
| CASE-02 | Aquavet admin can edit and update an existing bioremediation case without direct database access | Server-rendered admin list plus lightweight edit interaction using existing shadcn dialog/sheet patterns |
| CASE-03 | Aquavet admin can mark a case as draft, approved, or retired so only approved cases are eligible for chatbot grounding | Status column with constrained values, explicit admin transitions, and list filters/badges |
| CASE-04 | The system stores review metadata for each case, including author, last review date, and current publication status | Row-level latest-state metadata on the case record: author, last reviewed at/by, publication status |
| OPS-01 | Aquavet can review and manage the case library from the existing admin surface | Extend `/admin` and the existing bioremediation admin module instead of creating a disconnected tool |
</phase_requirements>

## Summary

Phase 1 should be planned as a brownfield admin CRUD extension, not as a new subsystem. The repo already has the right primitives: protected App Router admin pages, `requireAdminUser()` for access control, Supabase server clients for data access, server actions with `revalidatePath()`, and shadcn-style dialogs/tables for lightweight management flows. The fastest low-risk path is to add a new SQL migration for a governed case table, expose it through a server-rendered admin list inside the existing bioremediation module, and use small client-side dialogs or sheets for create/edit operations.

The critical planning decision is data shape, not UI chrome. Because later phases need structured filtering by product, species, zone, and approval status, the case library should be modeled as structured columns first and optional notes second. Store latest-state governance metadata directly on the case row to match the locked scope: `author_id`, `last_reviewed_by`, `last_reviewed_at`, and `status`. Do not add history tables, approver-only roles, or retrieval logic in this phase.

**Primary recommendation:** Plan Phase 1 around one new governed `bioremediation_cases` table, one admin list route under `/admin/bioremediation`, one server-actions file for create/update/status changes, and one typed form layer shared between create and edit.

## Project Constraints (from CLAUDE.md)

- Extend the existing Next.js 16 App Router and Supabase app; do not introduce a disconnected backend.
- UI text and admin copy should remain Spanish-first.
- Use server components in `app/` for data fetching and `'use client'` components only for interactivity.
- Use `lib/supabase/server.ts` on the server and never mix it with `lib/supabase/client.ts`.
- Admin surfaces must stay protected through `requireAdminUser()`.
- Forms should follow the existing React Hook Form + Zod stack already present in the repo.
- Styling should stay within Tailwind plus existing `components/ui/*` primitives.
- SQL schema changes should be added as ordered scripts under `scripts/`.
- Minimum validation baseline is `pnpm lint`, `pnpm build`, and manual verification in `pnpm dev`.
- Be aware that `next.config.mjs` currently sets `typescript.ignoreBuildErrors = true`; build green is useful but not a full type-safety guarantee.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `16.1.6` (repo pinned) | Protected admin routes, Server Components, Server Actions | Already the app shell and the lowest-friction way to add CRUD pages in place |
| React | `19.x` (repo pinned) | Client-side dialog/sheet interactivity | Already installed and aligned with Next.js 16 |
| `@supabase/supabase-js` + `@supabase/ssr` | `2.49.1` / `0.6.1` (repo pinned) | Database access with session-aware server client | Matches current auth and RLS model |
| React Hook Form | `7.54.1` (repo pinned) | Admin form state | Already available and integrates with existing shadcn form primitives |
| Zod | `3.24.1` (repo pinned) | Input validation and coercion | Already part of the stack and suitable for server-action parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn-style `components/ui/*` | repo local | Dialog, sheet, table, badge, select, input | Use for all new admin surfaces |
| `lucide-react` | `0.544.0` (repo pinned) | Icons | Reuse existing visual language in admin UI |
| `CsvExportButton` | repo local | CSV export for admin tables | Optional for case-library export if planning includes operations convenience |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend `/admin/bioremediation` | Build a separate `/admin/cases` module | Separate route is viable, but it weakens continuity with the existing bioremediation admin context |
| Server Actions on same-origin routes | Custom REST API handlers for admin CRUD | Adds more files and auth duplication without solving a real Phase 1 problem |
| `TEXT` + `CHECK` for status | PostgreSQL enum type | Enum is stricter, but the repo already uses text statuses and check constraints are easier to evolve in brownfield SQL scripts |

**Installation:**
```bash
pnpm install
```

**Version verification:** Registry verification via `npm view` was attempted on 2026-03-24 but stalled in the sandbox. Planning should preserve repo-pinned versions for this phase rather than coupling Phase 1 to dependency upgrades. For currency checks, official package sources observed during research showed active current releases for Next.js 16, Supabase JS 2.x, React Hook Form 7.x, and Zod 4.x, which confirms the chosen libraries remain standard even if this phase does not upgrade them.

## Architecture Patterns

### Recommended Project Structure
```text
app/
├── admin/
│   └── bioremediation/
│       ├── page.tsx                  # existing overview module
│       └── cases/
│           ├── page.tsx              # server-rendered case list + filters
│           └── actions.ts            # create, update, transition actions
components/
├── admin/
│   └── case-library/
│       ├── case-form-dialog.tsx      # create/edit dialog or sheet
│       ├── case-status-badge.tsx     # draft/approved/retired badge
│       └── case-table.tsx            # presentational table
lib/
├── case-library/
│   ├── schema.ts                     # zod schema + field coercion
│   └── types.ts                      # row/form types if needed
scripts/
└── 020_case_library.sql              # new table, indexes, RLS, helper policies
```

### Pattern 1: Server-rendered Admin Index With URL Filters
**What:** Keep the case library page as an async server component that reads `searchParams`, fetches filtered rows with the server Supabase client, and renders KPI cards plus a table.
**When to use:** For the main management surface and any default list, filter, and summary view.
**Example:**
```typescript
// Source: local repo pattern + Next.js App Router docs
import { requireAdminUser } from '@/lib/auth/roles'

export default async function AdminCaseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; species?: string; product?: string }>
}) {
  const params = await searchParams
  const { supabase } = await requireAdminUser()

  let query = supabase
    .from('bioremediation_cases')
    .select('id, title, species, product_name, status, last_reviewed_at, author:profiles!author_id(full_name)')
    .order('updated_at', { ascending: false })

  if (params.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params.species && params.species !== 'all') query = query.eq('species', params.species)
  if (params.product && params.product !== 'all') query = query.eq('product_name', params.product)

  const { data: cases = [] } = await query
  return <div>{/* cards, filters, table, create/edit entrypoints */}</div>
}
```

### Pattern 2: Server Actions Own Writes
**What:** Handle create, edit, and status-transition writes in `'use server'` actions that call `requireAdminUser()`, validate with Zod, write with Supabase, then `revalidatePath()`.
**When to use:** All same-origin admin mutations in this phase.
**Example:**
```typescript
// Source: local repo pattern + https://nextjs.org/docs/app/api-reference/functions/revalidatePath
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/auth/roles'
import { caseInputSchema } from '@/lib/case-library/schema'

export async function upsertCase(input: unknown) {
  const { supabase, user } = await requireAdminUser()
  const payload = caseInputSchema.parse(input)

  const row = {
    issue: payload.issue,
    zone: payload.zone,
    species: payload.species,
    product_name: payload.product_name,
    treatment_approach: payload.treatment_approach,
    dose: payload.dose,
    outcome: payload.outcome,
    status: payload.status,
    author_id: payload.id ? undefined : user.id,
    last_reviewed_by: payload.status === 'draft' ? null : user.id,
    last_reviewed_at: payload.status === 'draft' ? null : new Date().toISOString(),
  }

  const query = payload.id
    ? supabase.from('bioremediation_cases').update(row).eq('id', payload.id)
    : supabase.from('bioremediation_cases').insert(row)

  const { error } = await query
  if (error) throw new Error(error.message)

  revalidatePath('/admin/bioremediation/cases')
  revalidatePath('/admin/bioremediation')
}
```

### Pattern 3: Shared Typed Form for Create and Edit
**What:** One client component should render the same fields for create and edit, with a Zod-backed schema and controlled select inputs.
**When to use:** The case editor dialog or sheet.
**Example:**
```typescript
// Source: repo stack + https://github.com/react-hook-form/resolvers + https://zod.dev/
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export const caseInputSchema = z.object({
  id: z.string().uuid().optional(),
  issue: z.string().trim().min(1),
  zone: z.string().trim().min(1),
  species: z.string().trim().min(1),
  product_name: z.string().trim().min(1),
  treatment_approach: z.string().trim().min(1),
  dose: z.coerce.number().positive(),
  outcome: z.string().trim().min(1),
  status: z.enum(['draft', 'approved', 'retired']),
  notes: z.string().trim().max(4000).optional().or(z.literal('')),
})

const form = useForm<z.infer<typeof caseInputSchema>>({
  resolver: zodResolver(caseInputSchema),
  defaultValues,
})
```

### Pattern 4: Latest-state Governance Metadata on the Main Row
**What:** Store review metadata directly on `bioremediation_cases` instead of creating audit tables.
**When to use:** Entire Phase 1.
**Recommended columns:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `issue TEXT NOT NULL`
- `zone TEXT NOT NULL`
- `species TEXT NOT NULL`
- `product_name TEXT NOT NULL`
- `treatment_approach TEXT NOT NULL`
- `dose NUMERIC NOT NULL`
- `dose_unit TEXT NOT NULL DEFAULT 'L'`
- `outcome TEXT NOT NULL`
- `status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'retired'))`
- `author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`
- `last_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
- `last_reviewed_at TIMESTAMPTZ`
- `notes TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Anti-Patterns to Avoid
- **Separate approver subsystem:** Out of scope and directly conflicts with D-01 and D-02.
- **Freeform blob-first schema:** It will block structured filtering in Phase 2 and make governance slower.
- **API route plus Server Action duplication:** Pick one write path. For this phase, Server Actions are simpler.
- **Client-side auth assumptions:** Every write still needs `requireAdminUser()` server-side.
- **Audit-history table now:** Explicitly deferred; do not burn plan budget on it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin authorization | Custom role parsing per page | `requireAdminUser()` + existing `profiles.role = 'admin'` model | Already enforced locally and matches phase decisions |
| Write transport | Custom fetch wrappers for same-origin CRUD | Next.js Server Actions | Less boilerplate and easy revalidation in App Router |
| Form validation | Ad hoc string parsing in handlers | Zod + React Hook Form | Prevents numeric/status coercion bugs |
| UI primitives | Bespoke modal/table/badge system | Existing `components/ui/*` primitives | Matches current admin look and reduces design drift |
| Global DB access bypass | Service-role admin writes from browser | Server Supabase client under RLS | Preserves existing security model |
| Review history | Custom audit log tables | Nothing in Phase 1; store latest metadata only | Locked out of scope for this phase |

**Key insight:** The hard part here is governance semantics, not CRUD mechanics. The repo already has working admin/auth/UI patterns; hand-rolling anything below those abstractions creates risk without adding value.

## Common Pitfalls

### Pitfall 1: Modeling the case as one long narrative field
**What goes wrong:** Admins can save text, but later retrieval cannot reliably filter by species, product, zone, or status.
**Why it happens:** It feels faster during CRUD planning.
**How to avoid:** Make required retrieval-relevant fields first-class columns and keep optional notes secondary.
**Warning signs:** Filter controls need substring matching or manual tagging logic.

### Pitfall 2: Forgetting that `approved` must drive later eligibility
**What goes wrong:** Phase 1 stores statuses for display only, then Phase 2 has to retrofit data semantics.
**Why it happens:** Status is treated as presentation, not governance.
**How to avoid:** Plan `status` as a constrained field with explicit transitions and an index.
**Warning signs:** No database constraint, no default, no status filter on the list page.

### Pitfall 3: Storing review metadata inconsistently
**What goes wrong:** `last_reviewed_at` or `last_reviewed_by` becomes null or misleading after status changes.
**Why it happens:** Create and edit actions update different columns.
**How to avoid:** Decide semantics upfront. Recommended rule: update `last_reviewed_*` when a case enters `approved` or `retired`; preserve `author_id` as original creator.
**Warning signs:** Planner cannot explain what "last review date" means after a draft edit.

### Pitfall 4: Mixing server and client Supabase patterns
**What goes wrong:** Writes move into client components or browser Supabase code, weakening auth guarantees.
**Why it happens:** Modal-based UI tempts client-side mutation code.
**How to avoid:** Keep the form client-side, but submit to a Server Action that calls `requireAdminUser()`.
**Warning signs:** New case-library code imports `@/lib/supabase/client` into admin mutation paths.

### Pitfall 5: Under-scoping manual validation
**What goes wrong:** CRUD appears implemented, but state transitions, revalidation, and list filtering break in the actual admin flow.
**Why it happens:** The repo has no automated test framework today.
**How to avoid:** Plan explicit smoke scenarios for create, edit, approve, retire, and filter behavior.
**Warning signs:** Validation plan says only "run lint/build".

## Code Examples

Verified patterns from official sources and local repo conventions:

### Same-origin Admin Server Action
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/auth/roles'

export async function transitionCaseStatus(caseId: string, status: 'draft' | 'approved' | 'retired') {
  const { supabase, user } = await requireAdminUser()

  const reviewPatch =
    status === 'draft'
      ? { status }
      : { status, last_reviewed_by: user.id, last_reviewed_at: new Date().toISOString() }

  const { error } = await supabase
    .from('bioremediation_cases')
    .update(reviewPatch)
    .eq('id', caseId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/bioremediation/cases')
}
```

### SQL Shape That Matches Phase Scope
```sql
CREATE TABLE IF NOT EXISTS public.bioremediation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue TEXT NOT NULL,
  zone TEXT NOT NULL,
  species TEXT NOT NULL,
  product_name TEXT NOT NULL,
  treatment_approach TEXT NOT NULL,
  dose NUMERIC NOT NULL,
  outcome TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'retired')),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  last_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bioremediation_cases_status_idx
  ON public.bioremediation_cases (status);

CREATE INDEX IF NOT EXISTS bioremediation_cases_lookup_idx
  ON public.bioremediation_cases (product_name, species, zone);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate API endpoints for every internal write | Next.js App Router Server Actions for same-origin mutations | Modern App Router pattern, current in Next.js 16 docs | Lower boilerplate and easier cache/path revalidation |
| Ad hoc client validation only | Shared schema validation with Zod plus RHF | Standard current React form practice | Fewer coercion bugs and reusable create/edit logic |
| Treating admin state as purely presentational | Governance state designed for downstream retrieval | Required by this roadmap | Prevents Phase 2 retrofit work |

**Deprecated/outdated:**
- Building a separate admin microservice for this phase: contradicts project constraints and adds operational complexity.
- Introducing approver-only workflows now: explicitly out of scope.
- Tracking full review history now: explicitly deferred to later audit work.

## Open Questions

1. **Should the new screen live inside `/admin/bioremediation` or as a child route `/admin/bioremediation/cases`?**
   - What we know: Context prefers extending the current bioremediation admin module.
   - What's unclear: Whether the existing overview page should stay summary-only or absorb table management directly.
   - Recommendation: Plan a child route and add a nav entry or sub-link from the existing bioremediation module. It keeps continuity without overloading the current page.

2. **What exactly counts as `last review date`?**
   - What we know: Requirements need latest reviewer metadata only.
   - What's unclear: Whether saving a draft edit should update review date.
   - Recommendation: Define `last_reviewed_at` as the timestamp of the latest non-draft governance decision (`approved` or `retired`), not every content edit.

3. **Should issue, zone, species, and product remain free text or use controlled vocabularies in Phase 1?**
   - What we know: Requirements demand structured fields, not necessarily lookup tables.
   - What's unclear: Whether Aquavet already has stable taxonomy lists.
   - Recommendation: Start with required text/select-ready columns and keep planner room for lightweight enum arrays or curated select options in code, not new taxonomy tables unless business vocabulary is already stable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app, lint, build, dev | ✓ | `v24.14.0` | — |
| pnpm | Repo package manager | ✓ | `10.32.1` | `npm` for install scripts only, but plan should use pnpm |
| npm | Registry metadata checks | ✓ | `11.9.0` | — |
| Local dependency install (`node_modules`) | build/dev execution | ✓ | present | — |
| `.env.local` presence | Supabase-backed local execution | ✓ | present | actual keys not inspected |
| Supabase project credentials | Runtime DB/auth access | Unknown | — | none in repo; human-configured env required |

**Missing dependencies with no fallback:**
- None confirmed from the repo itself, but successful local execution still depends on valid Supabase environment values.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none — see Wave 0 |
| Quick run command | `pnpm lint` |
| Full suite command | `pnpm lint && pnpm build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CASE-01 | Create a structured case with required fields | manual smoke + static | `pnpm lint && pnpm build` | ❌ Wave 0 |
| CASE-02 | Edit an existing case and persist values | manual smoke + static | `pnpm lint && pnpm build` | ❌ Wave 0 |
| CASE-03 | Transition case between `draft`, `approved`, `retired` | manual smoke + static | `pnpm lint && pnpm build` | ❌ Wave 0 |
| CASE-04 | Show author, last review date, and publication state | manual smoke + static | `pnpm lint && pnpm build` | ❌ Wave 0 |
| OPS-01 | Manage case library inside existing admin surface | manual smoke + static | `pnpm lint && pnpm build` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm lint`
- **Per wave merge:** `pnpm lint && pnpm build`
- **Phase gate:** Full manual admin smoke pass plus `pnpm lint && pnpm build` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No automated test framework is configured; planner should not assume unit or integration tests already exist.
- [ ] No case-library smoke coverage exists for admin CRUD or status transitions.
- [ ] No reusable server-action test harness exists for admin mutations.
- [ ] Manual validation checklist must be explicit: create, edit, approve, retire, filter, reload persistence, and unauthorized access redirect.

## Sources

### Primary (HIGH confidence)
- Local repo: `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/producers/page.tsx`, `app/admin/bioremediation/page.tsx`, `app/admin/actions.ts`, `lib/auth/roles.ts`, `lib/supabase/server.ts`, `components/ui/form.tsx`, `scripts/001_create_schema.sql`, `scripts/010_admin_module.sql`
- Phase inputs: `.planning/phases/01-case-library-governance/01-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/STATE.md`
- Next.js docs: https://nextjs.org/docs/guides/building-forms
- Next.js `revalidatePath` docs: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- Supabase Next.js server-side auth docs: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security

### Secondary (MEDIUM confidence)
- React Hook Form resolvers: https://github.com/react-hook-form/resolvers
- Zod docs: https://zod.dev/
- React Hook Form releases: https://github.com/react-hook-form/react-hook-form/releases
- Zod releases: https://github.com/colinhacks/zod/releases

### Tertiary (LOW confidence)
- npm registry/package search pages were consulted for currency checks, but direct `npm view` verification stalled in the sandbox, so registry-derived version currency should be rechecked during execution if package upgrades are proposed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dominated by repo-pinned dependencies and existing local patterns
- Architecture: HIGH - matches current admin pages, auth model, and current Next.js/Supabase guidance
- Pitfalls: MEDIUM - some are design-risk inferences from later retrieval requirements, but they are consistent with roadmap scope

**Research date:** 2026-03-24
**Valid until:** 2026-04-23
