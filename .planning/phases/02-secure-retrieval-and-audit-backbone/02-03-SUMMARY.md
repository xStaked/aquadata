---
phase: 02
plan: 03
subsystem: database/rls
tags: [rls, security, bioremediation, gap-closure]
dependency_graph:
  requires:
    - 02-01-PLAN.md
    - 02-02-PLAN.md
  provides:
    - producer-read-access-approved-cases
  affects:
    - lib/bioremediation-chat/retrieval.ts
tech_stack:
  added: []
  patterns:
    - RLS SELECT-only policy for authenticated role
key_files:
  created:
    - scripts/022_producer_case_read_policy.sql
  modified: []
decisions:
  - Producer read policy uses TO authenticated (covers all logged-in users) because cases are global Aquavet knowledge, not tenant-specific data
  - No organization scoping on the case table — tenant isolation is enforced at the session/message level in scripts/021_bioremediation_chat.sql
  - USING clause mirrors the exact filters already in lib/bioremediation-chat/retrieval.ts to guarantee consistency
metrics:
  duration: 1min
  completed: "2026-03-25"
  tasks_completed: 1
  files_created: 1
requirements_closed:
  - SAFE-02
---

# Phase 02 Plan 03: Producer Case Read Policy Summary

**One-liner:** RLS SELECT policy granting authenticated producers access to approved, grounding-eligible bioremediation cases, closing the retrieval pipeline gap.

## What Was Built

A single SQL migration (`scripts/022_producer_case_read_policy.sql`) that adds a `producer_read_approved_grounding_cases` RLS policy to `public.bioremediation_cases`. The policy:

- Is FOR SELECT only — producers cannot INSERT, UPDATE, or DELETE cases
- Applies TO the `authenticated` role — all logged-in users (producers and admins)
- USING clause requires both `status = 'approved'` AND `status_usable_for_grounding = true`, exactly matching the filters in `lib/bioremediation-chat/retrieval.ts`
- Uses DROP POLICY IF EXISTS before CREATE POLICY for idempotent re-runs

## Gap Closed

Before this migration, `scripts/020_case_library.sql` only defined `admin_full_access_bioremediation_cases`. Non-admin producers querying `bioremediation_cases` via the server Supabase client received zero rows because RLS blocked all reads. This caused `retrieveApprovedCaseEvidence()` to always return `insufficient: true`, making the entire grounded-answer path hollow for producer traffic.

After applying this migration, the retrieval pipeline returns real case candidates, enabling grounded `kind: "answer"` responses with citations.

## Verification

All acceptance criteria passed:

- `CREATE POLICY "producer_read_approved_grounding_cases"` confirmed present
- `FOR SELECT` confirmed — read-only
- `TO authenticated` confirmed
- `status = 'approved'` confirmed
- `status_usable_for_grounding = true` confirmed
- `bioremediation_cases` table reference confirmed
- No INSERT/UPDATE/DELETE grants found

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add producer read policy for approved grounding-eligible cases | b6bd0d9 |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a pure SQL migration with no UI or data-binding stubs.

## Self-Check: PASSED

- [x] `scripts/022_producer_case_read_policy.sql` exists and contains correct policy
- [x] Commit b6bd0d9 verified in git log
