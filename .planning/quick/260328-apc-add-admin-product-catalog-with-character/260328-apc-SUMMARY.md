---
phase: quick-260328-apc
plan: "01"
subsystem: admin, bioremediation, catalog
tags: [admin-products, product-catalog, bioremediation, server-actions, sql-migration]
dependency_graph:
  requires: []
  provides: [ADMIN-PRODUCT-CATALOG]
  affects: [/admin, /admin/products, /admin/bioremediation, /admin/bioremediation/cases]
tech_stack:
  added: []
  patterns: [server-action, admin-catalog, client-dialog, legacy-compatible-selector]
key_files:
  created:
    - scripts/025_admin_product_catalog.sql
    - lib/bioremediation-products/schema.ts
    - app/admin/products/actions.ts
    - app/admin/products/page.tsx
    - components/admin/products/product-form-dialog.tsx
    - components/admin/products/product-table.tsx
  modified:
    - app/admin/page.tsx
    - components/admin/admin-nav.tsx
    - app/admin/bioremediation/page.tsx
    - app/admin/bioremediation/cases/page.tsx
    - components/admin/case-library/case-form-dialog.tsx
    - components/admin/case-library/case-table.tsx
decisions:
  - The new catalog governs admin product selection without replacing the hardcoded public calculator logic
  - Downstream records still persist `product_name` as text to avoid a risky foreign-key migration in a quick task
  - Case creation/editing uses catalog-first options but preserves legacy names for historical records
metrics:
  duration: "~25min"
  completed: "2026-03-28T00:00:00Z"
  tasks_completed: 3
  files_changed: 12
---

# Quick 260328-apc: Add Admin Product Catalog With Characteristics Summary

**One-liner:** Added a governed admin product catalog with characteristics, a dedicated `/admin/products` page, and catalog-backed product selectors in the admin bioremediation flows.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Product catalog table and schema contracts | working-tree | scripts/025_admin_product_catalog.sql, lib/bioremediation-products/schema.ts |
| 2 | Admin page and creation flow for products | working-tree | app/admin/products/page.tsx, app/admin/products/actions.ts, components/admin/products/* |
| 3 | Catalog reuse in admin bioremediation flows | working-tree | app/admin/bioremediation/page.tsx, app/admin/bioremediation/cases/page.tsx, components/admin/case-library/* |

## What Was Built

### SQL and Schema
Created `public.bioremediation_products` with core product characteristics: name, slug, category, description, presentation, dose unit, application method, species scope, sort order, and active flag. Added RLS policies for active-read and admin full access, plus an `updated_at` trigger.

### Admin Product Module
Added a new `/admin/products` screen with:
- product counters
- create-product dialog
- catalog table with activate/deactivate action

Also added the module entry to the admin nav and the admin home cards.

### Admin Bioremediation Integration
Updated admin bioremediation filters and case management to consume the catalog product list first, while preserving fallback for historical free-text products already stored in rows.

### Legacy-Safe Case Form
Changed the case dialog product field from free text to a governed select. If an old case contains a product name not present in the catalog, that value is still injected as a temporary option so editing does not break.

## Verification

- `pnpm build` passed successfully and included `/admin/products` in the generated routes.
- `pnpm lint` could not run in this environment because `eslint` is not available in the workspace PATH.
- Code review confirmed the catalog-first + legacy fallback behavior in both admin bioremediation pages.

## Deviations from Plan

One intentional deviation: the public calculator in `components/bioremediation-form.tsx` was left untouched. It still uses hardcoded products because making formulas/config dynamic would be a separate phase, not a safe quick task.

## Known Follow-Up

- If product characteristics should drive dose rules, create a second task or full phase to replace the hardcoded calculator config with catalog-backed rules.
- If historical records should normalize to product IDs, that requires a migration plan and compatibility work across analytics and retrieval queries.
