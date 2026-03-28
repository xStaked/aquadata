---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/admin/case-library/case-csv-import-dialog.tsx
  - app/admin/bioremediation/cases/actions.ts
  - app/admin/bioremediation/cases/page.tsx
autonomous: true
requirements: [CSV-BULK-IMPORT]
must_haves:
  truths:
    - "Admin can open a CSV import dialog from the cases page header"
    - "Admin can download a CSV template with correct columns and example data"
    - "Admin can upload a CSV file and see a preview of parsed rows with valid/invalid counts"
    - "Invalid rows show inline error messages explaining the issue"
    - "Confirming import inserts all valid rows as draft status into bioremediation_cases"
    - "Page revalidates after import so new cases appear in the table"
  artifacts:
    - path: "components/admin/case-library/case-csv-import-dialog.tsx"
      provides: "CSV import dialog with template download, file upload, preview table, and confirm action"
    - path: "app/admin/bioremediation/cases/actions.ts"
      provides: "bulkUpsertBioremediationCases server action"
      exports: ["bulkUpsertBioremediationCases"]
    - path: "app/admin/bioremediation/cases/page.tsx"
      provides: "Updated page header with CaseCsvImportDialog next to CaseFormDialog"
  key_links:
    - from: "components/admin/case-library/case-csv-import-dialog.tsx"
      to: "app/admin/bioremediation/cases/actions.ts"
      via: "calls bulkUpsertBioremediationCases server action on confirm"
      pattern: "bulkUpsertBioremediationCases"
    - from: "components/admin/case-library/case-csv-import-dialog.tsx"
      to: "lib/case-library/schema.ts"
      via: "validates each parsed row with caseInputSchema"
      pattern: "caseInputSchema\\.safeParse"
    - from: "app/admin/bioremediation/cases/page.tsx"
      to: "components/admin/case-library/case-csv-import-dialog.tsx"
      via: "renders CaseCsvImportDialog in header"
      pattern: "CaseCsvImportDialog"
---

<objective>
Add CSV bulk import for bioremediation cases in the admin panel. An "Importar CSV" button appears next to "Nuevo caso" in the cases page header, opening a dialog where the admin can download a template, upload a CSV, preview parsed rows with validation feedback, and confirm import of valid rows as draft cases.

Purpose: Enable admins to populate the governed case library in bulk instead of creating cases one by one.
Output: Working CSV import dialog, bulk insert server action, updated cases page.
</objective>

<execution_context>
@/Users/xstaked/.claude/get-shit-done/workflows/execute-plan.md
@/Users/xstaked/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/admin/bioremediation/cases/page.tsx
@app/admin/bioremediation/cases/actions.ts
@lib/case-library/schema.ts
@lib/case-library/types.ts
@components/admin/case-library/case-form-dialog.tsx

<interfaces>
<!-- Key types and contracts the executor needs -->

From lib/case-library/schema.ts:
```typescript
export const caseStatusValues = ['draft', 'approved', 'retired'] as const

export const caseInputSchema = z.object({
  id: z.string().uuid().optional(),
  issue: requiredCaseTextField,
  zone: requiredCaseTextField,
  species: requiredCaseTextField,
  product_name: requiredCaseTextField,
  treatment_approach: requiredCaseTextField,
  dose: z.coerce.number().positive(),
  dose_unit: requiredCaseTextField.default('L'),
  outcome: requiredCaseTextField,
  status: z.enum(caseStatusValues),
  notes: z.string().trim().max(4000).optional().transform(...)
})
```

From lib/case-library/types.ts:
```typescript
export type BioremediationCaseFormValues = z.infer<typeof caseInputSchema>
```

From app/admin/bioremediation/cases/actions.ts:
```typescript
export async function upsertBioremediationCase(input: unknown): Promise<void>
// Uses requireAdminUser(), caseInputSchema.parse(), supabase insert/update
// Calls revalidateCaseLibraryPaths() after mutation
```

Pattern from case-form-dialog.tsx:
- Uses Dialog/DialogContent/DialogHeader/DialogFooter from @/components/ui/dialog
- Uses Button from @/components/ui/button
- Uses useState for open/saving/error state
- Calls server action directly, closes dialog on success
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add bulk insert server action and create CSV import dialog component</name>
  <files>
    app/admin/bioremediation/cases/actions.ts,
    components/admin/case-library/case-csv-import-dialog.tsx
  </files>
  <action>
**1. Add `bulkUpsertBioremediationCases` to `app/admin/bioremediation/cases/actions.ts`:**

Add a new exported async function below the existing `transitionBioremediationCaseStatus`:

```typescript
export async function bulkUpsertBioremediationCases(
  cases: unknown[]
): Promise<{ inserted: number; errors: string[] }> {
```

- Call `requireAdminUser()` to get supabase + user
- Iterate over `cases`, validate each with `caseInputSchema.safeParse(...)` — skip invalid, collect errors
- For all valid cases, build an array of insert records (same shape as in `upsertBioremediationCase` but WITHOUT `id`, always `status: 'draft'`, `status_usable_for_grounding: false`, `last_reviewed_by: null`, `last_reviewed_at: null`, `author_id: user.id`)
- Use a single `supabase.from('bioremediation_cases').insert(validRecords)` for batch insert
- If insert error, throw
- Call `revalidateCaseLibraryPaths()`
- Return `{ inserted: validRecords.length, errors }`

**2. Create `components/admin/case-library/case-csv-import-dialog.tsx`:**

A `'use client'` component exporting `CaseCsvImportDialog`.

**State:** `open`, `file: File | null`, `parsedRows` (array of raw objects), `validationResults` (array of `{ row: number, data: object, valid: boolean, error?: string }`), `isImporting`, `importResult: { inserted: number, errors: string[] } | null`

**CSV Template download:**
- A "Descargar plantilla CSV" link/button
- Generates a Blob with header line: `issue,zone,species,product_name,treatment_approach,dose,dose_unit,outcome,notes`
- Second line with example: `"Amonia alta despues de lluvia","Caribe","Tilapia roja","AquaVet BioClear","Aplicacion directa en estanque",2.5,"L","Reduccion de amonia en 48h","Caso de ejemplo"`
- Triggers download as `plantilla-casos-bioremediacion.csv`

**CSV Parsing (client-side, plain JS):**
- On file select, read via FileReader as text
- Split by newlines, skip empty lines
- First line is header — validate it matches expected columns (case-insensitive trim). If headers don't match, show error "Las columnas del CSV no coinciden con la plantilla esperada"
- For each data row: split by comma (handle quoted fields with a simple regex or split logic — fields may contain commas inside double quotes), trim values, map to object using header names
- For each parsed row object, run `caseInputSchema.safeParse({ ...row, status: 'draft' })` to validate. Store valid/invalid status and first error message for invalid rows

**Preview UI:**
- Show total rows parsed, valid count (green), invalid count (red/amber)
- Table showing first 5 rows with columns: Fila, Problema, Especie, Producto, Dosis, Estado (valid/invalid icon)
- Invalid rows show inline error text, e.g. "Fila 3: dosis requerida"
- If there are more than 5 rows, show "... y N filas mas"

**Import action:**
- "Importar N casos validos" button (disabled while `isImporting` or no valid rows)
- On click: call `bulkUpsertBioremediationCases(validRowsData)` where validRowsData is the array of parsed objects for valid rows (each with `status: 'draft'`)
- On success: show brief success message, then close dialog after 1.5s
- On error: show error message

**Dialog structure:** Follow the same pattern as `case-form-dialog.tsx` — use Dialog, DialogContent (max-w-4xl), DialogHeader, DialogFooter from `@/components/ui/dialog`, Button from `@/components/ui/button`.

**Trigger button:** `<Button variant="outline"><Upload className="h-4 w-4" /> Importar CSV</Button>` — import Upload from lucide-react.

**All UI text in Spanish.** Labels: "Importar casos desde CSV", "Descargar plantilla CSV", "Seleccionar archivo CSV", "Vista previa", "Filas validas", "Filas con errores", "Importar N casos validos", "Importando...", "N casos importados exitosamente".
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - bulkUpsertBioremediationCases exists in actions.ts, accepts array, validates with caseInputSchema, batch inserts, revalidates paths
    - CaseCsvImportDialog component renders trigger button, template download, file upload, validation preview, and import confirmation
    - Build succeeds without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire CaseCsvImportDialog into the admin cases page header</name>
  <files>app/admin/bioremediation/cases/page.tsx</files>
  <action>
Update `app/admin/bioremediation/cases/page.tsx`:

1. Add import: `import { CaseCsvImportDialog } from '@/components/admin/case-library/case-csv-import-dialog'`

2. In the page header section (the div with `lg:items-end lg:justify-between`), replace the standalone `<CaseFormDialog />` with a flex container holding both buttons:

```tsx
<div className="flex items-center gap-2">
  <CaseCsvImportDialog />
  <CaseFormDialog />
</div>
```

This places "Importar CSV" (outline variant) to the left of "Nuevo caso" (primary variant), keeping the existing visual hierarchy where "Nuevo caso" is the primary action.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Cases page header shows both "Importar CSV" and "Nuevo caso" buttons side by side
    - Build succeeds
    - Clicking "Importar CSV" opens the import dialog
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` completes without errors
2. Navigate to `/admin/bioremediation/cases` — both buttons visible in header
3. Click "Importar CSV" — dialog opens
4. Click "Descargar plantilla CSV" — downloads a CSV file with correct headers and example row
5. Upload the template CSV — preview shows 1 valid row
6. Upload a CSV with intentionally invalid rows (missing dose) — invalid rows show inline errors
7. Click "Importar" — valid rows inserted as draft, page refreshes with new cases in table
</verification>

<success_criteria>
- Admin can bulk import bioremediation cases via CSV upload
- CSV template downloadable with correct columns and example data
- Client-side validation shows preview with valid/invalid row counts and inline errors
- Only valid rows are inserted as draft status
- Page auto-revalidates showing newly imported cases
- All UI copy in Spanish
</success_criteria>

<output>
After completion, create `.planning/quick/260328-fbs-add-csv-bulk-import-for-bioremediation-c/260328-fbs-SUMMARY.md`
</output>
