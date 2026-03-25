# Phase 1: Case Library Governance - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 adds a governed bioremediation case library to the existing admin product surface so Aquavet can create, edit, review, and maintain approved case knowledge without direct database access. This phase covers the case-management workflow and publication state needed to make cases eligible for assistant grounding. It does not add retrieval, chat answering, or broader audit-trace features.

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

No specific visual or interaction references were provided during discussion. Stay consistent with the current Spanish-first admin interface and existing table/dashboard patterns.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- `.planning/ROADMAP.md` — Phase 1 goal, boundary, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` — `CASE-01` through `CASE-04` and `OPS-01` define the required case-library capability.
- `.planning/PROJECT.md` — Brownfield constraints, admin-surface continuity, and the requirement to ground future chat answers in governed Aquavet cases.
- `.planning/STATE.md` — Current project focus and known concerns relevant to phase 1 planning.

### Existing admin patterns
- `app/admin/layout.tsx` — Admin-shell structure and navigation context for any new case-library screen.
- `app/admin/page.tsx` — Current admin dashboard style and form/table composition patterns.
- `app/admin/producers/page.tsx` — Existing admin list/filter/export pattern that can inform the case-library management view.
- `app/admin/bioremediation/page.tsx` — Existing bioremediation-focused admin module and the most natural surface to extend or mirror.

### Auth and persistence constraints
- `lib/auth/roles.ts` — Existing `admin` role enforcement, aligned with the decision that any admin can approve or retire cases.
- `scripts/010_admin_module.sql` — Admin-wide RLS access model that should be preserved for the case library.
- `scripts/001_create_schema.sql` — Current base schema and RLS conventions to follow when adding case-library tables.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAdminUser()` in `lib/auth/roles.ts`: Established admin gate for any new case-library routes or server actions.
- `app/admin/layout.tsx`: Existing admin shell and nav wrapper, so the new workflow should remain inside `/admin/*`.
- `app/admin/producers/page.tsx`: Reusable pattern for server-rendered filters, KPI cards, tables, and CSV-oriented admin data management.
- `app/admin/bioremediation/page.tsx`: Existing bioremediation-oriented admin reporting surface that gives the closest domain context for case-library placement.
- `components/ui/*`: Existing shadcn-style cards, badges, tables, dialogs, inputs, selects, and buttons are sufficient for phase 1 CRUD UI.

### Established Patterns
- Product UI copy is primarily Spanish, including admin surfaces.
- Admin pages are server components that fetch with the server Supabase client after `requireAdminUser()`.
- The repo already uses pragmatic, table-first admin views rather than heavy client-side state machines.
- SQL changes are introduced as ordered migration scripts under `scripts/`.

### Integration Points
- New case-library persistence should be added through a new numbered SQL migration with RLS rules compatible with the current admin-access model.
- New management screens should plug into the existing `/admin` shell and likely extend the current bioremediation admin module rather than creating a disconnected workflow.
- Review metadata should be modeled directly on the case record for phase 1 because only latest-state metadata is required.

</code_context>

<deferred>
## Deferred Ideas

- Approver-only permissions or author-cannot-self-approve rules.
- Status-transition audit history for each case.
- Retrieval, citation, and chat-serving concerns, which belong to later phases.

</deferred>

---

*Phase: 01-case-library-governance*
*Context gathered: 2026-03-24*
