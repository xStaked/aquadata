---
phase: quick
plan: 260328-gcx
subsystem: admin-product-catalog
tags: [image-upload, supabase-storage, admin, products]
dependency_graph:
  requires: [260328-apc]
  provides: [product-image-url]
  affects: [admin-products-page]
tech_stack:
  added: []
  patterns: [supabase-storage-upload, file-input-preview, server-action-formdata]
key_files:
  created:
    - scripts/026_product_image_column.sql
  modified:
    - lib/bioremediation-products/schema.ts
    - app/admin/products/actions.ts
    - components/admin/products/product-form-dialog.tsx
    - components/admin/products/product-table.tsx
    - app/admin/products/page.tsx
decisions:
  - Used standard HTML file input (hidden + styled button trigger) instead of shadcn component to avoid adding a new dependency
  - Image upload happens server-side via FormData in a 'use server' action to keep storage credentials server-only
  - Used plain <img> tag instead of Next Image to avoid domain configuration requirements for Supabase Storage CDN URLs
metrics:
  duration: 8min
  completed: 2026-03-28
  tasks_completed: 2
  files_modified: 6
---

# Quick Task 260328-gcx: Add Product Image Upload Summary

**One-liner:** Product image upload to Supabase Storage `product-images` bucket with 40x40 thumbnails and Package icon placeholder in the admin catalog table.

## What Was Built

Admin users can now upload a product image when creating a product in the bioremediation catalog. The image is stored in a Supabase Storage public bucket (`product-images`) and the public URL is persisted in the `bioremediation_products.image_url` column. The product table renders a 40x40 thumbnail for products with images and a gray Package icon placeholder for products without one.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | SQL migration, schema and server action for product image upload | dca40fb | scripts/026_product_image_column.sql, lib/bioremediation-products/schema.ts, app/admin/products/actions.ts |
| 2 | Image upload UI in product form and thumbnail column in table | 13e7cc9 | components/admin/products/product-form-dialog.tsx, components/admin/products/product-table.tsx, app/admin/products/page.tsx |

## Key Decisions

- **Standard file input pattern:** Used a hidden `<input type="file">` triggered by a styled button to avoid introducing a new UI dependency. Preview rendered via `URL.createObjectURL()`.
- **Server-side upload:** `uploadProductImage` is a `'use server'` action that receives FormData, so the Supabase service key never touches the browser.
- **Plain `<img>` tag:** Used instead of `next/image` to avoid configuring allowed remote hostnames for the Supabase Storage CDN domain.
- **Storage policies:** Admin-only INSERT/UPDATE/DELETE, public SELECT — matches the public bucket setting and existing admin RLS patterns from `025_admin_product_catalog.sql`.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - image_url is fully wired from upload through storage to the table display.

## Self-Check: PASSED

- scripts/026_product_image_column.sql: EXISTS
- lib/bioremediation-products/schema.ts: EXISTS (image_url field added)
- app/admin/products/actions.ts: EXISTS (uploadProductImage + image_url in insert)
- components/admin/products/product-form-dialog.tsx: EXISTS (image upload section with preview)
- components/admin/products/product-table.tsx: EXISTS (Imagen column with thumbnail/placeholder)
- app/admin/products/page.tsx: EXISTS (image_url in select query)
- Commit dca40fb: FOUND
- Commit 13e7cc9: FOUND
- pnpm build: PASSED
