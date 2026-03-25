---
phase: 01-case-library-governance
phase_number: 01
status: human_needed
created: 2026-03-25
updated: 2026-03-25
sources:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
requirements:
  - CASE-01
  - CASE-02
  - CASE-03
  - CASE-04
  - OPS-01
---

# Phase 01 Verification

## Goal

Aquavet can curate, review, and maintain the case library through the existing admin interface so only governed field knowledge is eligible for assistant grounding.

## Automated Checks

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm build` | PASS | Route `/admin/bioremediation/cases` builds successfully. |
| Acceptance grep checks | PASS | All required schema, action, UI, and checklist anchors are present. |
| `pnpm lint` | BLOCKED | Repository defines the script but `eslint` is not installed in `package.json`. |
| `pnpm exec tsc --noEmit` | BLOCKED | Pre-existing type errors remain in `components/monthly-feed-form.tsx`; no new case-library type errors remain. |

## Must-Have Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CASE-01 | Implemented, human verification required | `scripts/020_case_library.sql`, `lib/case-library/schema.ts`, `components/admin/case-library/case-form-dialog.tsx` |
| CASE-02 | Implemented, human verification required | `app/admin/bioremediation/cases/page.tsx`, `components/admin/case-library/case-form-dialog.tsx`, `components/admin/case-library/case-table.tsx` |
| CASE-03 | Implemented, human verification required | `app/admin/bioremediation/cases/actions.ts`, `components/admin/case-library/case-table.tsx`, `components/admin/case-library/case-status-badge.tsx` |
| CASE-04 | Implemented, human verification required | `scripts/020_case_library.sql`, `app/admin/bioremediation/cases/page.tsx`, `components/admin/case-library/case-table.tsx` |
| OPS-01 | Implemented, human verification required | `app/admin/bioremediation/page.tsx`, `app/admin/bioremediation/cases/page.tsx`, `01-MANUAL-CHECKLIST.md` |

## Human Verification

1. Create a case with all required structured fields from `/admin/bioremediation/cases` and confirm it persists after reload.
2. Edit an existing case and confirm the latest values still appear after closing the dialog and reloading the page.
3. Move one case through `draft`, `approved`, and `retired`, confirming only `approved` remains eligible for assistant grounding.
4. Confirm the management table surfaces `author`, `last_reviewed_at`, and current publication state after create and transition operations.
5. Open the case library through `/admin/bioremediation` and verify a non-admin session is redirected or denied.

## Conclusion

All phase deliverables are implemented and wired, but the validation contract for this phase is explicitly manual-smoke plus static checks. Phase 01 requires human approval after running `01-MANUAL-CHECKLIST.md`.
