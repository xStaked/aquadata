---
phase: quick
plan: 260328-gnm
subsystem: admin-product-catalog
tags: [edit-flow, server-action, admin, products]
dependency_graph:
  requires: [260328-apc, 260328-gcx]
  provides: [product-editing]
  affects: [admin-products-page]
tech_stack:
  added: []
  patterns: [dual-mode-dialog, server-action-update, row-level-edit-trigger]
key_files:
  created: []
  modified:
    - lib/bioremediation-products/schema.ts
    - app/admin/products/actions.ts
    - components/admin/products/product-form-dialog.tsx
    - components/admin/products/product-table.tsx
    - app/admin/products/page.tsx
decisions:
  - Reused the existing product creation dialog in dual mode instead of creating a second edit-only form
  - Kept row editing inside the table so admins can edit products without leaving `/admin/products`
  - Added update validation with slug collision protection excluding the current product ID
metrics:
  duration: 6min
  completed: 2026-03-28
  tasks_completed: 2
  files_modified: 5
---

# Quick Task 260328-gnm: Edit Product Functionality Summary

**One-liner:** Added inline product editing in `/admin/products` with prefilled dialog fields, update server action, and table-level edit triggers.

## What Was Built

Admin users can now edit existing bioremediation products directly from the product table. Each row exposes an `Editar` action that opens the same dialog used for creation, but in edit mode and prefilled with the current product data, including image, presentation, application method, species scope, and sort order.

Saving changes calls a dedicated `updateBioremediationProduct` server action, persists the update in Supabase, revalidates the admin routes, and refreshes the table state without requiring a manual reload.

## Tasks Completed

| # | Task | Files |
|---|------|-------|
| 1 | Added update schema and `updateBioremediationProduct` server action | lib/bioremediation-products/schema.ts, app/admin/products/actions.ts |
| 2 | Enabled edit mode in dialog and row-level edit trigger in table | components/admin/products/product-form-dialog.tsx, components/admin/products/product-table.tsx, app/admin/products/page.tsx |

## Key Decisions

- **Dual-mode dialog:** Reused `ProductFormDialog` for both create and edit flows to avoid diverging validation or UI logic.
- **Prefilled row editing:** Passed full row values from the table into the dialog so admins edit in context.
- **Route revalidation:** Revalidated `/admin`, `/admin/products`, `/admin/bioremediation`, and `/admin/bioremediation/cases` after updates because product metadata is reused across those admin views.

## Deviations from Plan

- The final pass also corrected the page query to explicitly select `application_method` and `sort_order`, which the edit dialog depends on for complete prefilling.

## Known Stubs

None. The edit flow is wired end-to-end.

## Self-Check

- `updateBioremediationProduct` exists and validates `id`
- `ProductFormDialog` supports `mode="edit"` with `defaultValues`
- `ProductTable` renders an `Editar` action per row
- `app/admin/products/page.tsx` now selects `application_method` and `sort_order`
