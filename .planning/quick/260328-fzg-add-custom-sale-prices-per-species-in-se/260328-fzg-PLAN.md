---
phase: quick-260328-fzg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/024_custom_fish_prices.sql
  - app/dashboard/settings/actions.ts
  - components/organization-fish-price-settings.tsx
  - app/dashboard/settings/page.tsx
  - app/dashboard/costs/page.tsx
autonomous: true
requirements: [CUSTOM-SALE-PRICES]
must_haves:
  truths:
    - "User can set a custom sale price per species in the settings page"
    - "Custom org prices appear as middle fallback between batch-level and SIPSA prices in the costs page"
    - "Species list is derived from the org's actual ponds (no manual species entry)"
    - "Empty price fields fall through to SIPSA market price"
  artifacts:
    - path: "scripts/024_custom_fish_prices.sql"
      provides: "JSONB column on organizations for custom fish prices"
      contains: "custom_fish_prices"
    - path: "components/organization-fish-price-settings.tsx"
      provides: "Client component for editing per-species prices"
      min_lines: 50
    - path: "app/dashboard/settings/actions.ts"
      provides: "Server action to persist custom fish prices"
      exports: ["updateOrganizationCustomFishPrices"]
    - path: "app/dashboard/costs/page.tsx"
      provides: "Updated price resolution chain with org custom prices"
  key_links:
    - from: "components/organization-fish-price-settings.tsx"
      to: "app/dashboard/settings/actions.ts"
      via: "updateOrganizationCustomFishPrices server action"
      pattern: "updateOrganizationCustomFishPrices"
    - from: "app/dashboard/costs/page.tsx"
      to: "organizations.custom_fish_prices"
      via: "Supabase query for org data, then species lookup in price resolution"
      pattern: "customFishPrices.*species"
---

<objective>
Add org-level custom sale prices per species in the settings page, and wire them into the costs page price resolution chain as a fallback between batch-level prices and SIPSA market prices.

Purpose: Producers often know their local sale price better than SIPSA averages. This lets them set org-wide defaults per species so the costs page reflects realistic revenue projections without overriding per-batch prices.

Output: SQL migration, settings UI component, server action, and updated costs page price logic.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/organization-fca-settings.tsx (pattern to follow for settings component)
@app/dashboard/settings/actions.ts (pattern to follow for server action)
@app/dashboard/settings/page.tsx (where to add the new component)
@app/dashboard/costs/page.tsx (price resolution logic at line ~148)

<interfaces>
<!-- Existing settings patterns the executor should follow exactly -->

From app/dashboard/settings/actions.ts:
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
// Pattern: get user -> get profile -> update organizations -> revalidate paths
```

From app/dashboard/settings/page.tsx:
```typescript
// Server component that fetches org data and passes to client component as props
// Currently selects: 'name, default_fca' from organizations
// Will need to also select 'custom_fish_prices'
```

From app/dashboard/costs/page.tsx (line 148):
```typescript
const salePrice = b.sale_price_per_kg || marketRef?.price_avg || 9000
// Must become: b.sale_price_per_kg || customFishPrices[species] || marketRef?.price_avg || 9000
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: SQL migration and server action for custom fish prices</name>
  <files>scripts/024_custom_fish_prices.sql, app/dashboard/settings/actions.ts</files>
  <action>
1. Create `scripts/024_custom_fish_prices.sql`:
   - `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_fish_prices JSONB DEFAULT '{}'::jsonb;`
   - Add a comment: stores `{ "Tilapia": 8500, "Cachama": 7000, ... }` — species name as key, price per kg as numeric value.
   - No RLS changes needed — organizations already has update policy for org members.

2. Add `updateOrganizationCustomFishPrices` server action to `app/dashboard/settings/actions.ts`:
   - Follow the exact same pattern as `updateOrganizationDefaultFca`: get user, get profile.organization_id, update organizations, revalidate paths.
   - Accept parameter: `customFishPrices: Record<string, number | null>`.
   - Before saving, filter out entries where value is null or empty — only store species with actual prices. This keeps the JSONB clean.
   - Update `organizations.custom_fish_prices` with the cleaned object.
   - Revalidate: `/dashboard/settings`, `/dashboard/costs`.
   - Return `{ id, customFishPrices }`.
   - All error messages in Spanish matching existing pattern.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>SQL migration file exists with JSONB column addition. Server action exported and callable, follows same auth pattern as updateOrganizationDefaultFca.</done>
</task>

<task type="auto">
  <name>Task 2: Settings UI component and costs page price resolution wiring</name>
  <files>components/organization-fish-price-settings.tsx, app/dashboard/settings/page.tsx, app/dashboard/costs/page.tsx</files>
  <action>
1. Create `components/organization-fish-price-settings.tsx` — a 'use client' component following `OrganizationFcaSettings` pattern:
   - Props: `{ species: string[]; initialPrices: Record<string, number>; marketPrices?: Record<string, number> }`.
   - `species` is the unique species list from the org's ponds (passed from server component).
   - `marketPrices` is an optional map of species->SIPSA price for showing reference in placeholders.
   - State: `prices` as `Record<string, string>` (string for input binding), initialized from `initialPrices`.
   - Renders a `Card` with:
     - `CardTitle`: "Precios de venta por especie"
     - `CardDescription`: "Define precios de venta de referencia por especie para tu finca. Se usan cuando no hay un precio definido a nivel de lote."
     - For each species: a row with `Label` (species name), `Input` (type="number", min="0", step="100"), and if marketPrices has that species, show `placeholder` as the SIPSA price formatted with `$` prefix.
     - Below each input: `<p className="text-xs text-muted-foreground">Dejar vacio para usar precio SIPSA{marketPrice ? ` ($${marketPrice.toLocaleString('es-CO')}/kg)` : ''}</p>`
     - If `species` array is empty, show a muted message: "No hay estanques con especies definidas. Agrega especies en tus estanques para configurar precios."
   - Single "Guardar precios" button using `useTransition` pattern (same as FCA component).
   - On save: build `Record<string, number | null>` from input values, call `updateOrganizationCustomFishPrices`, show success/error banners with same styled divs as FCA component.
   - Use `router.refresh()` on success.

2. Update `app/dashboard/settings/page.tsx`:
   - Import `OrganizationFishPriceSettings` and `getColombianMarketPrices` from `@/lib/market-data`.
   - Add `custom_fish_prices` to the organizations select: `'name, default_fca, custom_fish_prices'`.
   - Fetch ponds for the org: `supabase.from('ponds').select('species').eq('organization_id', profile.organization_id)`.
   - Derive unique species: `[...new Set(ponds?.map(p => p.species).filter(Boolean))]`.
   - Fetch market prices: `await getColombianMarketPrices('BOGOTA')`.
   - Build `marketPriceMap`: for each species, find matching market price entry (same fuzzy match as costs page — `species.toLowerCase().includes(mp.species.toLowerCase().split(' ')[0])`).
   - Render `<OrganizationFishPriceSettings>` below the existing `<OrganizationFcaSettings>` component.
   - Pass `species`, `initialPrices` (from `organization.custom_fish_prices || {}`), and `marketPrices` map.

3. Update `app/dashboard/costs/page.tsx` — wire org custom prices into price resolution:
   - After the existing `profile.organization_id` check, fetch org custom_fish_prices: add a query for `organizations` selecting `custom_fish_prices` with `.eq('id', profile.organization_id).single()`.
     - Alternatively, add it to existing queries if there is already an org fetch nearby. Check if one exists first. If not, add a new query inside the Promise.all.
   - Parse `customFishPrices` as `Record<string, number>` from the org row (default `{}`).
   - In the batches mapping (around line 148), change the price resolution from:
     `const salePrice = b.sale_price_per_kg || marketRef?.price_avg || 9000`
     to:
     `const speciesKey = pondInfo?.species ?? ''`
     `const orgCustomPrice = customFishPrices[speciesKey] || null`
     `const salePrice = b.sale_price_per_kg || orgCustomPrice || marketRef?.price_avg || 9000`
   - This preserves the exact fallback chain: batch override > org custom > SIPSA > hardcoded 9000.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>Settings page shows per-species price inputs populated from org data. Costs page uses the 4-level price resolution chain: batch > org custom > SIPSA > 9000. Build passes.</done>
</task>

</tasks>

<verification>
1. `pnpm build` passes without errors.
2. Settings page at `/dashboard/settings` renders the new "Precios de venta por especie" card below the FCA card.
3. Species list matches the org's ponds (no hardcoded species).
4. Saving a custom price persists to the database and shows success feedback.
5. Costs page at `/dashboard/costs` uses org custom price when batch has no override and the species matches.
6. Leaving a species price empty correctly falls through to SIPSA.
</verification>

<success_criteria>
- SQL migration adds `custom_fish_prices JSONB` column to `organizations`
- Settings page shows editable price per species with SIPSA reference
- Server action persists prices following existing auth/update pattern
- Costs page price chain: batch > org custom > SIPSA > 9000
- `pnpm build` succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260328-fzg-add-custom-sale-prices-per-species-in-se/260328-fzg-SUMMARY.md`
</output>
