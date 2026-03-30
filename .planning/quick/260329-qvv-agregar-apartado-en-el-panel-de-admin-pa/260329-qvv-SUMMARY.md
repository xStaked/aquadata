---
phase: quick-260329-qvv
plan: 01
subsystem: admin
tags: [admin, invitations, navigation]
dependency_graph:
  requires: []
  provides: [admin-invitations-page, admin-nav-invitations-tab]
  affects: [admin-dashboard-widget]
tech_stack:
  added: []
  patterns: [server-component-page, requireAdminUser, supabase-join-query]
key_files:
  created:
    - app/admin/invitations/page.tsx
  modified:
    - components/admin/admin-nav.tsx
    - app/admin/page.tsx
decisions:
  - Invitaciones nav tab placed after Productos to keep access-control items grouped
  - profiles join uses used_by FK to resolve user name without a separate query
metrics:
  duration: 8min
  completed_date: 2026-03-29
  tasks: 2
  files: 3
---

# Phase quick-260329-qvv Plan 01: Admin Invitations Page Summary

**One-liner:** Full invitation codes listing page at /admin/invitations with KPI cards, status badges, and nav/dashboard links.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create /admin/invitations page with full codes table | cac6588 | app/admin/invitations/page.tsx |
| 2 | Add Invitaciones to AdminNav and link dashboard widget | d6b7070 | components/admin/admin-nav.tsx, app/admin/page.tsx |

## What Was Built

- **`app/admin/invitations/page.tsx`** — Server component protected by `requireAdminUser`. Fetches all rows from `invitation_codes` with a profiles join on `used_by` to resolve the user name. Renders two KPI cards (disponibles / usados) and a full table with columns: Codigo (monospace), Descripcion, Estado (destructive badge for used / default badge for available), Usado por, Fecha de uso, Creado. Empty state shown when no codes exist. All UI text in Spanish.
- **`components/admin/admin-nav.tsx`** — Added `Ticket` import and new nav item `{ href: '/admin/invitations', label: 'Invitaciones', icon: Ticket }` after Productos.
- **`app/admin/page.tsx`** — Added "Ver todos" link with `ArrowRight` icon below the create-code form in the invitation widget. Added Invitaciones card to the modulos administrativos grid.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is fetched live from the database with no placeholders.

## Self-Check: PASSED

- `app/admin/invitations/page.tsx` — file exists
- Commit `cac6588` — verified in git log
- Commit `d6b7070` — verified in git log
- `pnpm build` passes after both tasks
