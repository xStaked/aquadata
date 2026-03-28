---
phase: quick
plan: 260328-gcx
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/026_product_image_column.sql
  - lib/bioremediation-products/schema.ts
  - app/admin/products/actions.ts
  - components/admin/products/product-form-dialog.tsx
  - components/admin/products/product-table.tsx
  - app/admin/products/page.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Admin puede subir una imagen al crear un producto"
    - "La imagen subida se muestra como miniatura en la tabla de productos"
    - "Productos sin imagen muestran un placeholder visual"
    - "La imagen se almacena en Supabase Storage bucket 'product-images'"
  artifacts:
    - path: "scripts/026_product_image_column.sql"
      provides: "image_url column on bioremediation_products + storage bucket + policies"
    - path: "components/admin/products/product-form-dialog.tsx"
      provides: "Image upload input in create form"
    - path: "components/admin/products/product-table.tsx"
      provides: "Image thumbnail column in product table"
  key_links:
    - from: "components/admin/products/product-form-dialog.tsx"
      to: "app/admin/products/actions.ts"
      via: "createBioremediationProduct with image_url param"
    - from: "app/admin/products/actions.ts"
      to: "Supabase Storage"
      via: "supabase.storage.from('product-images').upload()"
---

<objective>
Add image upload support to the admin product catalog. Admins can upload a product image when creating a product, and the image displays as a thumbnail in the product table.

Purpose: Visual product identification in the admin catalog.
Output: SQL migration, updated form with image picker, updated table with thumbnail column.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/admin/products/page.tsx
@app/admin/products/actions.ts
@components/admin/products/product-form-dialog.tsx
@components/admin/products/product-table.tsx
@lib/bioremediation-products/schema.ts
@scripts/025_admin_product_catalog.sql

<interfaces>
From lib/bioremediation-products/schema.ts:
```typescript
export const bioremediationProductInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(productCategoryValues),
  description: z.string().trim().min(10).max(2000),
  presentation: trimmedOptionalText,
  dose_unit: z.string().trim().min(1).max(50).optional().transform(...),
  application_method: trimmedOptionalText,
  species_scope: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(100),
})
```

From components/admin/products/product-table.tsx:
```typescript
export type ProductTableRow = {
  id: string
  name: string
  category: 'agua' | 'suelo'
  description: string
  dose_unit: string
  species_scope: string[]
  presentation: string | null
  is_active: boolean
}
```

From app/admin/products/actions.ts:
```typescript
export async function createBioremediationProduct(input: unknown)
export async function toggleBioremediationProductStatus(input: unknown)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: SQL migration + schema + server action for image upload</name>
  <files>scripts/026_product_image_column.sql, lib/bioremediation-products/schema.ts, app/admin/products/actions.ts</files>
  <action>
1. Create `scripts/026_product_image_column.sql`:
   - `ALTER TABLE public.bioremediation_products ADD COLUMN IF NOT EXISTS image_url TEXT;`
   - Create Supabase Storage bucket via SQL: `INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;`
   - Create storage policy for admin upload: authenticated users with admin role can INSERT objects into `product-images` bucket. Use `public.is_admin(auth.uid())` for the check, matching existing RLS patterns.
   - Create storage policy for public SELECT on `product-images` bucket (public read since bucket is public).

2. Update `lib/bioremediation-products/schema.ts`:
   - Add `image_url: z.string().url().optional()` to `bioremediationProductInputSchema`.

3. Update `app/admin/products/actions.ts`:
   - Add a new server action `uploadProductImage(formData: FormData)` that:
     - Calls `requireAdminUser()` to get supabase client
     - Extracts the file from formData
     - Validates file type (image/jpeg, image/png, image/webp) and size (max 2MB)
     - Generates a unique filename: `${crypto.randomUUID()}.${ext}`
     - Uploads to Supabase Storage bucket `product-images` via `supabase.storage.from('product-images').upload(filename, file, { contentType: file.type })`
     - Returns the public URL via `supabase.storage.from('product-images').getPublicUrl(filename).data.publicUrl`
   - Update `createBioremediationProduct` to include `image_url: payload.image_url ?? null` in the insert object.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>SQL migration adds image_url column and storage bucket+policies. Schema accepts optional image_url. Server action can upload images and returns public URL. createBioremediationProduct persists image_url.</done>
</task>

<task type="auto">
  <name>Task 2: Image upload UI in form + thumbnail in product table</name>
  <files>components/admin/products/product-form-dialog.tsx, components/admin/products/product-table.tsx, app/admin/products/page.tsx</files>
  <action>
1. Update `components/admin/products/product-form-dialog.tsx`:
   - Add `image_url: string` to `ProductFormState` (default: `''`).
   - Add `imageFile: File | null` to component state (separate from form state, not serialized).
   - Add an image upload section above the form grid (full width, `sm:col-span-2`):
     - A label "Imagen del producto" in Spanish.
     - A file input (`accept="image/jpeg,image/png,image/webp"`) styled with Tailwind. Use a hidden `<input type="file">` triggered by a styled button "Seleccionar imagen".
     - When file selected: validate client-side (type + max 2MB), store in `imageFile` state, show preview using `URL.createObjectURL(file)` in a 96x96 rounded container.
     - Show file name and a remove button (X icon) to clear selection.
   - Update `handleSave`:
     - If `imageFile` is set, call `uploadProductImage(formData)` first to get the public URL.
     - Pass `image_url` to `createBioremediationProduct` in the parsed data.
   - Import `uploadProductImage` from actions.
   - Import `ImagePlus, X` from `lucide-react`.

2. Update `components/admin/products/product-table.tsx`:
   - Add `image_url: string | null` to `ProductTableRow` type.
   - Add a new first column header "Imagen" in the table.
   - In each row, render a 40x40 rounded image thumbnail using `<img>` tag (not Next Image to avoid domain issues) with `object-cover`. If `image_url` is null, show a gray placeholder div with a `Package` icon from lucide-react centered.

3. Update `app/admin/products/page.tsx`:
   - Add `image_url` to the Supabase select query: `.select('id, name, category, description, dose_unit, species_scope, presentation, is_active, image_url')`.

All UI text in Spanish.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>Product form shows an image upload field with preview. Product table shows image thumbnails. Products without image show a placeholder icon. Build passes without errors.</done>
</task>

</tasks>

<verification>
- `pnpm build` passes
- SQL migration file exists at `scripts/026_product_image_column.sql` with ALTER TABLE, bucket creation, and storage policies
- Product form dialog has file input, preview, and integrates upload into save flow
- Product table renders image thumbnail as first visual column
- All new UI text is in Spanish
</verification>

<success_criteria>
- Admin can select an image file when creating a product
- Image uploads to Supabase Storage `product-images` bucket
- Image URL persists in `bioremediation_products.image_url` column
- Product table shows 40x40 thumbnail for products with images
- Products without images show a placeholder icon
- Build compiles successfully
</success_criteria>

<output>
After completion, create `.planning/quick/260328-gcx-agregar-imagen-a-productos-admin/260328-gcx-SUMMARY.md`
</output>
