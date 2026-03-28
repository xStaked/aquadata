---
phase: quick
plan: 01
subsystem: admin/case-library
tags: [csv-import, bulk-insert, admin, bioremediation, case-library]
dependency_graph:
  requires: []
  provides: [CSV_BULK_IMPORT]
  affects: [app/admin/bioremediation/cases, components/admin/case-library]
tech_stack:
  added: []
  patterns: [server-action bulk insert, client-side CSV parsing, Zod per-row validation]
key_files:
  created:
    - components/admin/case-library/case-csv-import-dialog.tsx
  modified:
    - app/admin/bioremediation/cases/actions.ts
    - app/admin/bioremediation/cases/page.tsx
decisions:
  - CSV parsing done client-side with plain JS (no library) so bundle stays lean and the xlsx dependency is not pulled in for a simple import flow
  - Template download uses Blob/URL.createObjectURL pattern consistent with existing csv-export-button pattern
  - All inserted rows are forced to status=draft and status_usable_for_grounding=false in the server action regardless of what the client sends
metrics:
  duration: 2min
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 3
---

# Quick 260328-fbs: Add CSV Bulk Import for Bioremediation Cases Summary

**One-liner:** CSV bulk import dialog for admin bioremediation cases with client-side validation, template download, row preview, and batch server action insert.

## What Was Built

### Task 1: bulkUpsertBioremediationCases action + CaseCsvImportDialog component

Added `bulkUpsertBioremediationCases` to `app/admin/bioremediation/cases/actions.ts`:
- Accepts `unknown[]` array, validates each entry with `caseInputSchema.safeParse`
- Builds valid records always as `status: 'draft'`, `status_usable_for_grounding: false`, no reviewer fields
- Batch inserts all valid records in a single Supabase insert call
- Calls `revalidateCaseLibraryPaths()` after insert
- Returns `{ inserted, errors }` to the caller

Created `components/admin/case-library/case-csv-import-dialog.tsx`:
- Trigger button: outline variant with Upload icon, label "Importar CSV"
- Template download generates a Blob with correct headers and one example row, triggers download as `plantilla-casos-bioremediacion.csv`
- CSV parsing: pure JS with quoted-field support (handles commas inside double quotes)
- Header validation: checks all 9 expected columns present (case-insensitive)
- Per-row validation: `caseInputSchema.safeParse({ ...row, status: 'draft' })` — stores valid/invalid + first error
- Preview table: shows first 5 rows with Fila, Problema, Especie, Producto, Dosis, Estado columns; invalid rows shown with error text and red background
- Import button: disabled when no valid rows or importing; calls server action with valid rows only
- Auto-closes dialog 1.5s after successful import
- All copy in Spanish

### Task 2: Cases page header updated

Updated `app/admin/bioremediation/cases/page.tsx`:
- Imported `CaseCsvImportDialog`
- Wrapped both `CaseCsvImportDialog` and `CaseFormDialog` in `flex items-center gap-2` div
- "Importar CSV" (outline) appears left of "Nuevo caso" (primary), preserving visual hierarchy

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are wired end to end.

## Self-Check: PASSED

Files verified:
- `components/admin/case-library/case-csv-import-dialog.tsx` — exists
- `app/admin/bioremediation/cases/actions.ts` — bulkUpsertBioremediationCases added
- `app/admin/bioremediation/cases/page.tsx` — CaseCsvImportDialog wired

Commits verified:
- f3069af — feat(quick-01): add bulkUpsertBioremediationCases action and CaseCsvImportDialog component
- 85d0185 — feat(quick-01): wire CaseCsvImportDialog into cases page header
