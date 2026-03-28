---
phase: quick-260328-fzg
plan: "01"
subsystem: settings, costs
tags: [custom-prices, settings, costs, organizations, sql-migration]
dependency_graph:
  requires: []
  provides: [CUSTOM-SALE-PRICES]
  affects: [dashboard/settings, dashboard/costs]
tech_stack:
  added: []
  patterns: [server-action, jsonb-column, fallback-chain, use-transition]
key_files:
  created:
    - scripts/024_custom_fish_prices.sql
    - components/organization-fish-price-settings.tsx
  modified:
    - app/dashboard/settings/actions.ts
    - app/dashboard/settings/page.tsx
    - app/dashboard/costs/page.tsx
decisions:
  - Org custom prices stored as JSONB on organizations table — no separate table needed for a simple key/value per-species map
  - Null/zero price entries are filtered before persisting to keep JSONB clean and make empty = "fall through"
  - Species list derived from org ponds (not hardcoded) so the UI stays accurate without manual maintenance
metrics:
  duration: "~8min"
  completed: "2026-03-28T16:35:09Z"
  tasks_completed: 2
  files_changed: 5
---

# Quick 260328-fzg: Add Custom Sale Prices Per Species in Settings Summary

**One-liner:** Org-level custom sale price per species via JSONB column and settings UI, wired into a 4-level costs page fallback chain (batch > org custom > SIPSA > 9000).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SQL migration and server action for custom fish prices | 2249870 | scripts/024_custom_fish_prices.sql, app/dashboard/settings/actions.ts |
| 2 | Settings UI component and costs page price resolution wiring | d765562 | components/organization-fish-price-settings.tsx, app/dashboard/settings/page.tsx, app/dashboard/costs/page.tsx |

## What Was Built

### SQL Migration (scripts/024_custom_fish_prices.sql)
Adds `custom_fish_prices JSONB DEFAULT '{}'` column to `organizations`. Stores `{ "Tilapia": 8500, "Cachama": 7000 }`. No RLS changes needed — organizations update policy already covers org members.

### Server Action (app/dashboard/settings/actions.ts)
`updateOrganizationCustomFishPrices(customFishPrices: Record<string, number | null>)` follows the exact same auth pattern as `updateOrganizationDefaultFca`. Filters out null/zero entries before saving. Revalidates `/dashboard/settings` and `/dashboard/costs`.

### Settings UI (components/organization-fish-price-settings.tsx)
Client component with `useTransition` save pattern. Shows a numeric input per species derived from the org's actual ponds. Placeholder displays the SIPSA reference price for that species when available. Helper text under each input confirms the empty fallback behavior. Empty species list shows a friendly message.

### Settings Page (app/dashboard/settings/page.tsx)
Now fetches org `custom_fish_prices`, org's ponds, and SIPSA market prices in a single `Promise.all`. Derives unique species from ponds. Builds `marketPriceMap` using the same fuzzy species matching as the costs page. Renders `OrganizationFishPriceSettings` below the FCA card.

### Costs Page (app/dashboard/costs/page.tsx)
Fetches `organizations.custom_fish_prices` in the existing `Promise.all`. Price resolution chain:
```
const salePrice = b.sale_price_per_kg || orgCustomPrice || marketRef?.price_avg || 9000
```
Batch-level price remains the highest priority. Org custom is the new middle fallback. SIPSA and hardcoded 9000 remain as final backstops.

## Verification

- `pnpm build` passes cleanly — all routes compile without errors.
- Settings page renders "Precios de venta por especie" card below FCA card with species from org ponds.
- SIPSA reference prices shown in placeholder/helper text per species.
- Saving persists prices and refreshes the page.
- Empty price inputs fall through to SIPSA in costs page.
- Costs page 4-level chain confirmed in code review.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The `custom_fish_prices` column is wired end-to-end: settings UI writes to DB, costs page reads from DB. No placeholder data.

## Self-Check: PASSED

- scripts/024_custom_fish_prices.sql — FOUND
- components/organization-fish-price-settings.tsx — FOUND
- app/dashboard/settings/actions.ts (updateOrganizationCustomFishPrices) — FOUND
- app/dashboard/settings/page.tsx (OrganizationFishPriceSettings rendered) — FOUND
- app/dashboard/costs/page.tsx (4-level price chain) — FOUND
- Commit 2249870 — FOUND
- Commit d765562 — FOUND
