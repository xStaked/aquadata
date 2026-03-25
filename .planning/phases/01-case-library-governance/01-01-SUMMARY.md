---
phase: 01-case-library-governance
plan: 01
subsystem: database
tags: [supabase, postgres, zod, nextjs, server-actions]
requires: []
provides:
  - Governed bioremediation case table with admin-only RLS access
  - Shared schema and TypeScript contracts for case-library writes
  - Admin-only server actions for case create, edit, and status transitions
affects: [phase-1-ui, retrieval, grounding]
tech-stack:
  added: []
  patterns:
    - SQL migrations define review-state enforcement close to the table
    - Server actions own admin writes and route revalidation for case-library mutations
key-files:
  created:
    - scripts/020_case_library.sql
    - lib/case-library/schema.ts
    - lib/case-library/types.ts
    - app/admin/bioremediation/cases/actions.ts
  modified: []
key-decisions:
  - "Case status remains a text field with a CHECK constraint to match the repo's existing SQL style."
  - "Grounding eligibility is enforced both in write actions and at the table layer so non-approved cases cannot become grounding-eligible."
  - "Draft transitions clear latest review metadata rather than preserving stale reviewer state."
patterns-established:
  - "Case-library features should import shared contracts from lib/case-library instead of redefining field names."
  - "Future admin case UI should call the server actions directly rather than introducing API routes."
requirements-completed: [CASE-01, CASE-03, CASE-04]
duration: 36 min
completed: 2026-03-25
---

# Phase 01 Plan 01: Governed case persistence and write contract Summary

**Governed bioremediation case storage with approved-only grounding enforcement, shared Zod contracts, and admin-only server mutations**

## Performance

- **Duration:** 36 min
- **Started:** 2026-03-25T01:45:00Z
- **Completed:** 2026-03-25T02:21:27Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added the governed `bioremediation_cases` SQL migration with latest-state review metadata, indexes, RLS, and a trigger that prevents non-approved grounding eligibility.
- Created the shared case-library schema and row/form types so future UI work can use one canonical contract for inputs and status values.
- Implemented admin-only server actions for upsert and explicit status transitions, including route revalidation for the admin bioremediation surfaces.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared case-library contracts** - `315f0f2` (feat)
2. **Task 2: Add the governed case-library migration and policies** - `9d3a896` (feat)
3. **Task 3: Implement admin-only server actions for create, edit, and publication state changes** - `4ad2e41` (feat)

## Files Created/Modified
- `lib/case-library/schema.ts` - Canonical Zod schema for case input and status transitions.
- `lib/case-library/types.ts` - Shared case row, status, and form-value TypeScript contracts.
- `scripts/020_case_library.sql` - Governed case-library table, indexes, RLS policy, and status sync trigger.
- `app/admin/bioremediation/cases/actions.ts` - Admin-only create, edit, and status-transition server actions.

## Decisions Made
- Used the existing repo convention of `TEXT` plus a `CHECK` constraint for status values instead of introducing a new Postgres enum.
- Kept review metadata as latest-state fields on the main case row to stay inside the locked Phase 1 scope and avoid a history table.
- Cleared reviewer metadata when a case returns to `draft` so the row does not imply a stale approved or retired review state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `pnpm lint` is currently blocked by repository setup because the `lint` script calls `eslint`, but `eslint` is not installed in `package.json`.
- `pnpm exec tsc --noEmit` reports pre-existing type errors in `components/monthly-feed-form.tsx`; these are outside the files touched by this plan.
- The spawned executor did not produce observable filesystem output, so execution was completed inline via the workflow fallback path.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 can build the admin management UI directly on top of the new case-library schema, types, and actions.
- Manual schema application for `scripts/020_case_library.sql` is still required in the target Supabase environment before the UI can persist data.

## Self-Check: PASSED

- Confirmed `scripts/020_case_library.sql`, `lib/case-library/schema.ts`, `lib/case-library/types.ts`, and `app/admin/bioremediation/cases/actions.ts` exist on disk.
- Confirmed task commits `315f0f2`, `9d3a896`, and `4ad2e41` exist in git history.

---
*Phase: 01-case-library-governance*
*Completed: 2026-03-25*
