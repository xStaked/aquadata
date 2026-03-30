---
phase: quick-260329-qvv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/admin/invitations/page.tsx
  - components/admin/admin-nav.tsx
  - app/admin/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Admin can navigate to /admin/invitations from the nav bar"
    - "Admin sees a table of ALL invitation codes with code, description, status, used_by name, used_at, created_at"
    - "Used codes show a red/destructive badge, available codes show a green/default badge"
    - "Admin dashboard invitation widget links to the full invitations page"
  artifacts:
    - path: "app/admin/invitations/page.tsx"
      provides: "Full invitation codes listing page"
    - path: "components/admin/admin-nav.tsx"
      provides: "Invitaciones nav tab"
    - path: "app/admin/page.tsx"
      provides: "Ver todos link on invitation widget"
  key_links:
    - from: "components/admin/admin-nav.tsx"
      to: "/admin/invitations"
      via: "Link href"
    - from: "app/admin/page.tsx"
      to: "/admin/invitations"
      via: "Link href on Ver todos"
---

<objective>
Create an admin invitations page at `/admin/invitations` showing all invitation codes in a table, add it to AdminNav, and link the existing dashboard widget to it.

Purpose: Admins currently can only see the count of unused codes. They need visibility into all codes — used and available — to manage invitations effectively.
Output: New invitations page, updated nav, updated dashboard widget.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/admin/page.tsx
@app/admin/products/page.tsx
@components/admin/admin-nav.tsx
@lib/auth/roles.ts
@scripts/008_invitation_codes.sql
</context>

<interfaces>
<!-- invitation_codes table schema -->
```sql
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

<!-- AdminNav items array pattern -->
```typescript
const items = [
  { href: '/admin', label: 'Resumen', icon: ShieldCheck },
  { href: '/admin/producers', label: 'Productores', icon: Users },
  // ...
]
```

<!-- requireAdminUser pattern -->
```typescript
import { requireAdminUser } from '@/lib/auth/roles'
const { supabase } = await requireAdminUser()
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Create /admin/invitations page with full codes table</name>
  <files>app/admin/invitations/page.tsx</files>
  <action>
Create a server component page following the same pattern as `app/admin/products/page.tsx`.

1. Import `requireAdminUser` from `@/lib/auth/roles`, Card/CardContent/CardHeader/CardTitle from shadcn, Badge from shadcn, and `Ticket` + `CheckCircle2` + `XCircle` icons from lucide-react.

2. Fetch ALL invitation codes with a left join to profiles to get the user's name:
```typescript
const { data: codes = [] } = await supabase
  .from('invitation_codes')
  .select('id, code, description, used, used_by, used_at, created_at, profiles:used_by(full_name, email)')
  .order('created_at', { ascending: false })
```

3. Compute summary KPIs: total codes, used count, available count.

4. Render a header section matching the products page style (uppercase tracking label, bold title "Codigos de invitacion", subtitle "Gestiona los codigos de acceso a la plataforma para nuevos productores.").

5. Render two KPI cards in a 2-col grid: "Codigos disponibles" (available count) and "Codigos usados" (used count).

6. Render a Card with a table inside. Table columns:
   - **Codigo**: display `code` in a monospace font (`font-mono text-sm`)
   - **Descripcion**: display `description` or "-"
   - **Estado**: Badge — if `used` is true, render `<Badge variant="destructive">Usado</Badge>`, else `<Badge variant="default">Disponible</Badge>`
   - **Usado por**: if profiles relation exists, show `profiles.full_name || profiles.email`, else "-"
   - **Fecha de uso**: if `used_at`, format as `new Date(used_at).toLocaleDateString('es-CO')`, else "-"
   - **Creado**: format `created_at` as `new Date(created_at).toLocaleDateString('es-CO')`

7. Handle empty state: if no codes, show a centered message "No hay codigos de invitacion registrados".

8. All UI text in Spanish.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>Page renders at /admin/invitations with a table of all invitation codes, KPI cards, and proper status badges</done>
</task>

<task type="auto">
  <name>Task 2: Add Invitaciones to AdminNav and link dashboard widget</name>
  <files>components/admin/admin-nav.tsx, app/admin/page.tsx</files>
  <action>
1. In `components/admin/admin-nav.tsx`:
   - Add `Ticket` to the lucide-react import
   - Add a new entry to the `items` array after "Productos": `{ href: '/admin/invitations', label: 'Invitaciones', icon: Ticket }`

2. In `app/admin/page.tsx`:
   - In the invitation codes Card (the one with `<Ticket>` icon and "Codigos de invitacion" title), add a "Ver todos" link after the create-code form, before the closing `</CardContent>`:
   ```tsx
   <Link
     href="/admin/invitations"
     className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
   >
     Ver todos
     <ArrowRight className="h-3 w-3" />
   </Link>
   ```
   Note: `Link` and `ArrowRight` are already imported in this file.

3. Also add the invitations module to the "Modulos administrativos" grid at the bottom of admin/page.tsx:
   ```typescript
   {
     href: '/admin/invitations',
     title: 'Invitaciones',
     description: 'Codigos de acceso para nuevos productores',
     icon: Ticket,
   }
   ```
   Note: `Ticket` is already imported in this file.
  </action>
  <verify>
    <automated>cd /Users/xstaked/Desktop/projects/aquaculture-platform-mvp && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>AdminNav shows "Invitaciones" tab linking to /admin/invitations. Dashboard widget has "Ver todos" link. Modulos grid includes Invitaciones card.</done>
</task>

</tasks>

<verification>
- `pnpm build` passes without errors
- Navigate to /admin/invitations — table renders with all codes
- AdminNav shows Invitaciones tab and highlights when active
- Dashboard invitation widget has "Ver todos" link pointing to /admin/invitations
</verification>

<success_criteria>
Admin can see all invitation codes (used and available) in a dedicated page, navigate there from the nav bar or dashboard widget, and distinguish used from available codes via status badges.
</success_criteria>

<output>
After completion, create `.planning/quick/260329-qvv-agregar-apartado-en-el-panel-de-admin-pa/260329-qvv-SUMMARY.md`
</output>
