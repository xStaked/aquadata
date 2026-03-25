---
phase: 01-case-library-governance
plan: 02
subsystem: ui
tags: [nextjs, react, admin-ui, server-actions, supabase]
requires:
  - phase: 01-01
    provides: shared case schema, SQL table, and mutation actions
provides:
  - Server-rendered admin case library page with filters and KPI cards
  - Mounted create/edit dialog and row-level status controls
  - Manual smoke checklist for Phase 1 case governance
affects: [phase-2-retrieval, admin-bioremediation, operations]
tech-stack:
  added: []
  patterns:
    - Admin pages stay server-rendered and pass serialized rows into lightweight client controls
    - Case status changes happen from row-level action buttons instead of hidden implicit transitions
key-files:
  created:
    - app/admin/bioremediation/cases/page.tsx
    - components/admin/case-library/case-form-dialog.tsx
    - components/admin/case-library/case-status-badge.tsx
    - components/admin/case-library/case-table.tsx
    - .planning/phases/01-case-library-governance/01-MANUAL-CHECKLIST.md
  modified:
    - app/admin/bioremediation/page.tsx
    - next-env.d.ts
key-decisions:
  - "The case library stays inside the existing bioremediation admin module rather than becoming a separate admin area."
  - "Create and edit use the same dialog component so case fields remain aligned with the shared schema."
  - "The management table exposes all three statuses directly to admins, with approved as the only grounding-eligible state."
patterns-established:
  - "Admin reference-data screens should combine server-rendered filters with small client-side mutation controls."
  - "Operational QA for new admin workflows should ship with a manual checklist in the phase directory."
requirements-completed: [CASE-02, CASE-03, OPS-01]
duration: 32 min
completed: 2026-03-25
---

# Phase 01 Plan 02: Admin case management surface Summary

**Server-rendered Aquavet case-library management with mounted dialogs, explicit status controls, and a manual smoke checklist**

## Performance

- **Duration:** 32 min
- **Started:** 2026-03-25T01:56:00Z
- **Completed:** 2026-03-25T02:28:26Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added `/admin/bioremediation/cases` as a server-rendered management route with filters, KPI cards, author/reviewer metadata, and grounding eligibility visibility.
- Delivered a mounted create/edit dialog plus explicit row-level `draft`, `approved`, and `retired` controls wired to the Phase 1 server actions.
- Linked the existing bioremediation admin overview into the governed case library and documented the full manual verification path in a dedicated checklist.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the server-rendered case-library index and management table** - `2487f7d` (feat)
2. **Task 2: Wire mounted create/edit dialogs and CASE-03 status controls into the admin surface** - `ce02a24` (feat)
3. **Task 3: Document the manual smoke checklist required for Phase 1 validation** - `8a94d6b` (docs)

## Files Created/Modified
- `app/admin/bioremediation/cases/page.tsx` - Server-rendered case-library route with filters, KPI cards, and table wiring.
- `components/admin/case-library/case-form-dialog.tsx` - Mounted create/edit dialog using the shared schema and server action.
- `components/admin/case-library/case-table.tsx` - Governance table with edit entrypoints and explicit status-transition buttons.
- `components/admin/case-library/case-status-badge.tsx` - Shared visual state for draft, approved, and retired cases.
- `app/admin/bioremediation/page.tsx` - Entry card from the existing bioremediation admin overview into the governed library.
- `.planning/phases/01-case-library-governance/01-MANUAL-CHECKLIST.md` - Manual smoke steps for CRUD, state transitions, and access control.
- `next-env.d.ts` - Route type import aligned with the new admin page.

## Decisions Made
- Kept the case-library experience embedded under `/admin/bioremediation` to preserve domain continuity for Aquavet admins.
- Used a single dialog for both create and edit so the same field contract is reused everywhere.
- Surfaced grounding eligibility as explicit copy in both the page header and row metadata to make approval semantics obvious.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `pnpm lint` remains blocked because the repo defines a lint script but does not install `eslint`.
- `pnpm exec tsc --noEmit` still fails on pre-existing type errors in `components/monthly-feed-form.tsx`; the new case-library files did not add new typecheck failures after the typed-route import was updated.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 now has both the governed persistence layer and the admin management UI needed before retrieval work begins.
- The manual checklist is ready to run in `pnpm dev` once the new SQL migration has been applied to the target Supabase environment.

## Self-Check: PASSED

- Confirmed the route, admin components, and manual checklist files exist on disk.
- Confirmed task commits `2487f7d`, `ce02a24`, and `8a94d6b` exist in git history.

---
*Phase: 01-case-library-governance*
*Completed: 2026-03-25*
