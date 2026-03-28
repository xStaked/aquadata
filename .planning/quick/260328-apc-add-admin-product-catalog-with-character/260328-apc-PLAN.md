---
phase: quick-260328-apc
plan: 01
type: plan
wave: 1
depends_on: []
files_expected:
  - scripts/025_admin_product_catalog.sql
  - lib/bioremediation-products/schema.ts
  - app/admin/products/page.tsx
  - app/admin/products/actions.ts
  - components/admin/products/product-form-dialog.tsx
  - components/admin/products/product-table.tsx
  - components/admin/admin-nav.tsx
  - app/admin/page.tsx
  - app/admin/bioremediation/page.tsx
  - app/admin/bioremediation/cases/page.tsx
  - components/admin/case-library/case-form-dialog.tsx
autonomous: true
requirements: [ADMIN-PRODUCT-CATALOG]
must_haves:
  truths:
    - "Admin can create products from the admin panel without touching SQL manually"
    - "Each product stores core characteristics needed for bioremediation operations"
    - "Admin can see the catalog in a dedicated page with active/inactive status"
    - "Catalog products feed admin bioremediation filters and case creation UI"
    - "Existing calculator dose logic remains unchanged in this quick task"
  artifacts:
    - path: "scripts/025_admin_product_catalog.sql"
      provides: "bioremediation_products table with RLS and admin-safe defaults"
      contains: "CREATE TABLE IF NOT EXISTS public.bioremediation_products"
    - path: "app/admin/products/actions.ts"
      provides: "server actions to create and toggle catalog products"
      exports: ["createBioremediationProduct", "toggleBioremediationProductStatus"]
    - path: "app/admin/products/page.tsx"
      provides: "admin products page with list and creation entrypoint"
    - path: "components/admin/products/product-form-dialog.tsx"
      provides: "dialog form to create products with characteristics"
    - path: "components/admin/case-library/case-form-dialog.tsx"
      provides: "case form wired to product catalog options instead of free-text-only flow"
  key_links:
    - from: "components/admin/products/product-form-dialog.tsx"
      to: "app/admin/products/actions.ts"
      via: "createBioremediationProduct server action"
      pattern: "createBioremediationProduct"
    - from: "app/admin/bioremediation/page.tsx"
      to: "public.bioremediation_products"
      via: "product filter options sourced from active catalog products"
      pattern: "bioremediation_products"
    - from: "components/admin/case-library/case-form-dialog.tsx"
      to: "public.bioremediation_products"
      via: "product selection sourced from catalog records"
      pattern: "SelectItem"
---

<objective>
Add a lightweight admin-managed bioremediation product catalog so admins can register products and their core characteristics from the admin panel, then reuse that catalog in the existing admin bioremediation flows.

Purpose: The codebase currently treats `product_name` as free text and keeps the calculator products hardcoded in the client. This quick task introduces a governed catalog for admin operations without refactoring the calculator engine yet.

Output: SQL migration, admin products page, create/toggle actions, product form dialog, navigation entry, and catalog-backed product selectors in the admin bioremediation module.
</objective>

<scope>
In scope:
- Create catalog table and admin UI to add products with characteristics
- Show catalog in admin panel
- Reuse catalog in admin bioremediation filters and case form

Out of scope:
- Replacing the hardcoded calculator dose engine in `components/bioremediation-form.tsx`
- Migrating historical rows in `bioremediation_treatments` or `bioremediation_cases` to foreign keys
- Full edit/delete/versioning workflow for products
</scope>

<context>
@app/admin/page.tsx
@components/admin/admin-nav.tsx
@app/admin/bioremediation/page.tsx
@app/admin/bioremediation/cases/page.tsx
@components/admin/case-library/case-form-dialog.tsx
@app/admin/bioremediation/cases/actions.ts
@lib/auth/roles.ts
@components/bioremediation-form.tsx

<observations>
- There is no `products` or `bioremediation_products` table today.
- Admin surfaces already follow a server-page + server-action + client-dialog pattern.
- `product_name` is currently stored as plain text in treatments and cases, so the lowest-risk first step is a governed catalog that still writes names as text downstream.
- The public calculator uses hardcoded product keys with different business logic, so making it dynamic is a separate phase, not a quick task.
</observations>

<proposed_data_model>
Create `public.bioremediation_products` with:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name TEXT NOT NULL UNIQUE`
- `slug TEXT NOT NULL UNIQUE`
- `category TEXT NOT NULL CHECK (category IN ('agua', 'suelo'))`
- `description TEXT NOT NULL`
- `presentation TEXT`
- `dose_unit TEXT NOT NULL DEFAULT 'L/ha'`
- `application_method TEXT`
- `species_scope TEXT[] NOT NULL DEFAULT '{}'`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `sort_order INTEGER NOT NULL DEFAULT 100`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Rationale:
- These characteristics are enough for admin cataloging and guided selection.
- We keep downstream storage as product name text for compatibility with current queries.
</proposed_data_model>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add product catalog table and schema contracts</name>
  <files>
    scripts/025_admin_product_catalog.sql,
    lib/bioremediation-products/schema.ts
  </files>
  <action>
1. Create `scripts/025_admin_product_catalog.sql`:
   - Create `public.bioremediation_products` with the fields defined above.
   - Add `updated_at` trigger using the repo's existing SQL style if a generic helper exists; otherwise use a simple trigger in the same file.
   - Enable RLS.
   - Add policies:
     - authenticated users can `SELECT` active products
     - admin users can `SELECT/INSERT/UPDATE` all products
   - Add indexes on `slug`, `is_active`, and `sort_order`.

2. Create `lib/bioremediation-products/schema.ts`:
   - Export `productCategoryValues = ['agua', 'suelo'] as const`
   - Export `bioremediationProductInputSchema` using zod with:
     - `name` min 2
     - `category` enum
     - `description` min 10
     - optional `presentation`
     - optional `dose_unit` default `'L/ha'`
     - optional `application_method`
     - optional `species_scope` array of trimmed strings
     - optional `sort_order`
   - Export inferred TS type for form values.
  </action>
  <verify>
    <automated>pnpm build</automated>
  </verify>
  <done>Catalog table exists with basic governance and a reusable input schema exists for the admin UI/server actions.</done>
</task>

<task type="auto">
  <name>Task 2: Add admin page and creation flow for products</name>
  <files>
    app/admin/products/actions.ts,
    app/admin/products/page.tsx,
    components/admin/products/product-form-dialog.tsx,
    components/admin/products/product-table.tsx,
    components/admin/admin-nav.tsx,
    app/admin/page.tsx
  </files>
  <action>
1. Create `app/admin/products/actions.ts`:
   - `createBioremediationProduct(input: unknown)`
   - `toggleBioremediationProductStatus(input: { id: string; isActive: boolean })`
   - Both actions must use `requireAdminUser()`, validate with zod, write through Supabase, and `revalidatePath('/admin')`, `revalidatePath('/admin/products')`, `revalidatePath('/admin/bioremediation')`.
   - Generate `slug` server-side from `name`.
   - Return Spanish errors aligned with existing admin actions.

2. Create `components/admin/products/product-form-dialog.tsx`:
   - Follow the same client dialog pattern used in the case library.
   - Fields:
     - nombre
     - categoria (`agua` / `suelo`)
     - descripcion
     - presentacion
     - unidad de dosis
     - metodo de aplicacion
     - especies objetivo (comma-separated, normalized to array)
     - orden
   - Primary CTA: `Guardar producto`.

3. Create `components/admin/products/product-table.tsx`:
   - Show columns: nombre, categoria, unidad, especies, estado.
   - Add inline active/inactive badge and a secondary button to activate/deactivate.
   - Keep this table read-mostly; no edit flow in this quick task.

4. Create `app/admin/products/page.tsx`:
   - Require admin user.
   - Query `bioremediation_products` ordered by `sort_order, name`.
   - Render page intro + `ProductFormDialog` + `ProductTable`.
   - Add empty state: `Aun no hay productos registrados`.

5. Update admin discovery:
   - Add `/admin/products` to [components/admin/admin-nav.tsx](/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/components/admin/admin-nav.tsx).
   - Add a "Productos" module card in [app/admin/page.tsx](/Users/xstaked/Desktop/projects/aquaculture-platform-mvp/app/admin/page.tsx).
  </action>
  <verify>
    <automated>pnpm lint && pnpm build</automated>
  </verify>
  <done>Admin can open a dedicated products page, create a product, and toggle active/inactive state from the catalog table.</done>
</task>

<task type="auto">
  <name>Task 3: Reuse catalog products inside admin bioremediation flows</name>
  <files>
    app/admin/bioremediation/page.tsx,
    app/admin/bioremediation/cases/page.tsx,
    components/admin/case-library/case-form-dialog.tsx
  </files>
  <action>
1. Update `app/admin/bioremediation/page.tsx`:
   - Read active catalog products from `bioremediation_products`.
   - Use catalog names as the preferred source for filter options.
   - Preserve fallback behavior so legacy treatment rows still display even if their product name is not in the catalog.

2. Update `app/admin/bioremediation/cases/page.tsx`:
   - Same pattern for filter options: catalog-first, legacy-safe fallback.

3. Update `components/admin/case-library/case-form-dialog.tsx`:
   - Replace the fully free-text `product_name` input with a select/combobox sourced from catalog products.
   - Keep a low-risk escape hatch:
     - if initial value exists and is not present in catalog, render it as a temporary option so editing old records does not break.
   - Do not change persisted DB shape; continue saving `product_name` as text.
  </action>
  <verify>
    <automated>pnpm build</automated>
  </verify>
  <done>Catalog products are visible in admin filters and case creation, while historical rows remain compatible.</done>
</task>

</tasks>

<verification>
1. Run `pnpm lint && pnpm build`.
2. Apply `scripts/025_admin_product_catalog.sql`.
3. Open `/admin/products` and create a product with category, description, unit, and species.
4. Confirm the new product appears in the catalog table with active status.
5. Confirm `/admin/bioremediation` filter shows the product.
6. Confirm `/admin/bioremediation/cases` filter and create dialog show the product.
7. Confirm legacy rows with older `product_name` values still render and remain editable.
</verification>

<success_criteria>
- Admin has a dedicated product catalog page
- A product can be created from the UI with core characteristics
- Catalog records can be activated/deactivated
- Admin bioremediation filters and case form consume the catalog
- No regression in legacy rows that still store product names as free text
- `pnpm lint && pnpm build` succeed
</success_criteria>

<risks>
- If the user wants product characteristics to directly drive calculator formulas, this quick task is too small; that should become a full phase or a second quick task.
- Because downstream tables still persist names as text, duplicate naming rules must be enforced carefully at creation time.
</risks>

<output>
If executed, produce:
- `.planning/quick/260328-apc-add-admin-product-catalog-with-character/260328-apc-SUMMARY.md`
</output>
