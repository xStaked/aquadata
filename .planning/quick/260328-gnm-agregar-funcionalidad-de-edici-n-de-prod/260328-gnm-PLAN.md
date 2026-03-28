---
phase: quick
plan: 260328-gnm
type: execute
wave: 1
depends_on: []
files_modified:
  - app/admin/products/actions.ts
  - components/admin/products/product-form-dialog.tsx
  - components/admin/products/product-table.tsx
autonomous: true
requirements: [edit-products]
must_haves:
  truths:
    - "Admin can click an edit button on any product row in the table"
    - "Edit dialog opens pre-filled with that product's current values (name, description, category, dose_unit, presentation, application_method, species_scope, sort_order, image)"
    - "Admin can modify any field and save — changes persist in the database"
    - "After saving edits, the table reflects updated values without manual refresh"
  artifacts:
    - path: "app/admin/products/actions.ts"
      provides: "updateBioremediationProduct server action"
      exports: ["updateBioremediationProduct"]
    - path: "components/admin/products/product-form-dialog.tsx"
      provides: "Dual-mode create/edit dialog following case-form-dialog pattern"
    - path: "components/admin/products/product-table.tsx"
      provides: "Edit button per row triggering the dialog in edit mode"
  key_links:
    - from: "components/admin/products/product-table.tsx"
      to: "components/admin/products/product-form-dialog.tsx"
      via: "Renders ProductFormDialog with mode='edit' and defaultValues from row"
    - from: "components/admin/products/product-form-dialog.tsx"
      to: "app/admin/products/actions.ts"
      via: "Calls updateBioremediationProduct on save when mode='edit'"
---

<objective>
Add edit functionality to the admin product catalog so admins can modify existing product fields (name, description, category, dose_unit, presentation, application_method, species_scope, sort_order, image) directly from the product table.

Purpose: Currently products can only be created and toggled active/inactive. Admins need to correct or update product details without recreating entries.
Output: Working edit flow — button in table, pre-filled dialog, server action for update.
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
@components/admin/case-library/case-form-dialog.tsx (reference pattern for create/edit dual-mode dialog)

<interfaces>
<!-- Existing schema used by the form dialog -->
From lib/bioremediation-products/schema.ts:
```typescript
export const productCategoryValues = ['agua', 'suelo'] as const
export const bioremediationProductInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(productCategoryValues),
  description: z.string().trim().min(10).max(2000),
  presentation: trimmedOptionalText,
  dose_unit: z.string().trim().min(1).max(50).optional().transform(v => v || 'L/ha'),
  application_method: trimmedOptionalText,
  species_scope: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(100),
  image_url: z.string().url().optional(),
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
  image_url: string | null
}
```

<!-- Pattern reference from case-form-dialog.tsx -->
The case-form-dialog uses this dual-mode pattern:
```typescript
type CaseFormDialogProps = {
  defaultValues?: Partial<BioremediationCaseFormValues>
  mode?: 'create' | 'edit'
  trigger?: ReactNode
  productOptions?: string[]
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add updateBioremediationProduct server action and refactor dialog to support edit mode</name>
  <files>app/admin/products/actions.ts, components/admin/products/product-form-dialog.tsx</files>
  <action>
**In app/admin/products/actions.ts:**

Add a new server action `updateBioremediationProduct(input: unknown)` that:
1. Calls `requireAdminUser()` for auth
2. Parses input with a schema that extends `bioremediationProductInputSchema` adding a required `id: z.string().uuid()` field. Create this as `bioremediationProductUpdateSchema` in `lib/bioremediation-products/schema.ts` — it should be the input schema merged with `z.object({ id: z.string().uuid() })`.
3. Generates slug from name using existing `slugifyProductName`
4. Checks for slug collision excluding the current product ID (add `.neq('id', payload.id)` to the existing slug check query)
5. Runs `supabase.from('bioremediation_products').update({...fields}).eq('id', payload.id).select('*').single()`
6. Calls `revalidateProductPaths()` and returns data
7. On error throws with descriptive Spanish message

**In lib/bioremediation-products/schema.ts:**

Export `bioremediationProductUpdateSchema` — merge `bioremediationProductInputSchema` with `z.object({ id: z.string().uuid() })`.

**In components/admin/products/product-form-dialog.tsx:**

Refactor following the case-form-dialog pattern:

1. Change props to accept `mode?: 'create' | 'edit'`, `defaultValues?: Partial<ProductFormState & { id: string }>`, and `trigger?: ReactNode`. Default mode to `'create'`.
2. Add a `buildFormState(defaultValues?)` helper that returns `ProductFormState` pre-filled from defaultValues or defaults. For `species_scope`, join the array into comma-separated string. For `sort_order`, convert number to string. For `image_url`, set from defaultValues.
3. In the `useEffect` on `open`, initialize form via `buildFormState(defaultValues)` instead of `defaultFormState`.
4. When `defaultValues?.image_url` exists and no new `imageFile` is selected, show the existing image as preview (set `imagePreview` to `defaultValues.image_url`). Track whether the image is "existing" vs "newly selected" to avoid revoking existing URLs.
5. In `handleSave`: if mode is `'edit'`, call `updateBioremediationProduct` (imported from actions) with the parsed data plus `id: defaultValues.id`. If mode is `'create'`, keep calling `createBioremediationProduct`.
6. Update dialog title: "Registrar producto de bioremediacion" for create, "Editar producto de bioremediacion" for edit.
7. Update save button text: "Guardar producto" for create, "Guardar cambios" for edit.
8. When `trigger` prop is provided, use it as DialogTrigger child. Otherwise render the existing "Nuevo producto" button (create mode default).
  </action>
  <verify>pnpm build</verify>
  <done>Server action `updateBioremediationProduct` exists and is exported. Dialog renders in both create and edit modes with correct titles and save behavior. Build passes.</done>
</task>

<task type="auto">
  <name>Task 2: Add edit button to product table rows</name>
  <files>components/admin/products/product-table.tsx, app/admin/products/page.tsx</files>
  <action>
**In components/admin/products/product-table.tsx:**

1. Import `ProductFormDialog` from `@/components/admin/products/product-form-dialog`
2. Import `Pencil` icon from `lucide-react`
3. In the actions `<td>` of each row, add an edit button BEFORE the existing toggle button. Wrap both buttons in a `flex items-center gap-2` container.
4. The edit button renders `ProductFormDialog` in edit mode:
   ```tsx
   <ProductFormDialog
     mode="edit"
     defaultValues={{
       id: row.id,
       name: row.name,
       category: row.category,
       description: row.description,
       presentation: row.presentation ?? '',
       dose_unit: row.dose_unit,
       application_method: '',  // not in table row, leave empty
       species_scope: row.species_scope.join(', '),
       sort_order: String(0),   // not in table row, leave default
       image_url: row.image_url ?? '',
     }}
     trigger={
       <Button type="button" variant="ghost" size="sm">
         <Pencil className="h-4 w-4" />
         Editar
       </Button>
     }
   />
   ```

5. To get `application_method` and `sort_order` in the edit form, update `ProductTableRow` type to include `application_method: string | null` and `sort_order: number`.

**In app/admin/products/page.tsx:**

Update the Supabase select query to also fetch `application_method` and `sort_order`:
```
.select('id, name, category, description, dose_unit, species_scope, presentation, is_active, image_url, application_method, sort_order')
```

Then update the `defaultValues` passed to `ProductFormDialog` in the table to use these real values instead of empty/default placeholders.
  </action>
  <verify>pnpm build</verify>
  <done>Each product row shows an "Editar" button with pencil icon. Clicking it opens the dialog pre-filled with all product fields. Saving updates the product and the table reflects changes after revalidation. Build passes.</done>
</task>

</tasks>

<verification>
1. `pnpm build` completes without errors
2. Navigate to /admin/products — table renders with "Editar" button on each row
3. Click "Editar" — dialog opens pre-filled with product data
4. Modify a field and save — table reflects the update
5. "Nuevo producto" button still works for creating new products
</verification>

<success_criteria>
- Edit dialog opens with all fields pre-populated from the selected product
- Saving edits persists changes to the database and refreshes the table
- Create flow continues to work unchanged
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/260328-gnm-agregar-funcionalidad-de-edici-n-de-prod/260328-gnm-SUMMARY.md`
</output>
