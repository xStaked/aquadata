# Architecture

## Summary

The application follows a pragmatic Next.js App Router architecture with light layering. Routing, server-side data fetches, and protected layouts live in `app/`; interactive workflows live in client components under `components/`; shared domain helpers and external integrations live under `lib/`; and feature-specific stateful logic is pushed into hooks when forms become complex.

## High-Level Shape

- UI entrypoints: `app/**/*.tsx`
- Shared client UI: `components/**/*.tsx`
- Stateful client feature logic: `hooks/**/*.ts(x)`
- Server/browser integration helpers: `lib/**/*.ts`
- SQL schema evolution: `scripts/*.sql`

There is no separate API service or domain package. The app is a single deployable Next.js surface.

## Main Layers

## 1. Route and Layout Layer

Responsibilities:
- request entrypoints
- shell composition
- high-level auth redirects
- server-side data loading for pages

Key files:
- `app/layout.tsx`
- `app/page.tsx`
- `app/dashboard/layout.tsx`
- `app/admin/layout.tsx`
- `app/api/ocr/route.ts`
- `app/api/market-prices/sync/route.ts`

## 2. Feature UI Layer

Responsibilities:
- forms
- tables
- charts
- navigation
- per-feature interactions

Key files:
- `components/upload-form.tsx`
- `components/manual-record-form.tsx`
- `components/bioremediation-form.tsx`
- `components/analytics-charts.tsx`
- `components/dashboard-sidebar.tsx`

## 3. Domain / Integration Layer

Responsibilities:
- Supabase clients
- auth-role guards
- market-price retrieval
- AI provider selection
- formatting and utility helpers

Key files:
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/proxy.ts`
- `lib/auth/roles.ts`
- `lib/ai/provider.ts`
- `lib/market-data.ts`
- `lib/sipsa/client.ts`

## 4. Persistence Layer

Responsibilities:
- schema creation
- table changes
- RLS policies
- seed/demo data

Key files:
- `scripts/001_create_schema.sql`
- `scripts/002_seed_demo_data.sql`
- `scripts/010_admin_module.sql`

## Auth and Request Flow

1. Incoming request enters Next.js.
2. `proxy.ts` delegates to `lib/supabase/proxy.ts`.
3. A request-scoped Supabase server client is created.
4. The session is refreshed through `supabase.auth.getUser()`.
5. Unauthenticated users hitting `/dashboard/*` are redirected to `/auth/login`.
6. Layouts and pages do additional role-aware fetches as needed.

Admin-specific flow:
- `app/admin/layout.tsx` calls `requireAdminUser()` from `lib/auth/roles.ts`
- non-admin users are redirected to `/dashboard`

## Data Flow Patterns

## Server-rendered feature pages

Pattern:
- page/layout fetches with the server Supabase client
- passes data or renders server-driven content directly

Examples:
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/admin/page.tsx`

## Client-driven forms with local calculation

Pattern:
- client component owns UI
- hook encapsulates state and feature logic
- optional save action writes directly to Supabase from browser client

Example:
- `components/bioremediation-form.tsx`
- `hooks/use-bioremediation.ts`

## API-route mediated AI processing

Pattern:
- client uploads or sends JSON to route handler
- route invokes AI provider
- route returns structured result
- user validates or saves downstream

Example:
- `app/api/ocr/route.ts`
- `components/upload-form.tsx`

## Architectural Strengths

- Simple to navigate for a single-product team
- Clear distinction between browser and server Supabase clients
- SQL migrations make data-model changes explicit
- Existing provider abstraction gives one reasonable insertion point for new AI capabilities

## Architectural Weak Spots

- Business logic is spread between pages, components, hooks, and route handlers instead of dedicated domain services
- Some features write to Supabase directly from the client, which can complicate auditing and richer validation
- The build is configured to ignore TypeScript errors, weakening the safety net
- There is no canonical backend pattern yet for conversational AI, retrieval, or field-case knowledge storage

## Likely Extension Path For Bioremediation Chat

The most coherent extension would be:
- UI entry in `app/dashboard/bioremediation/page.tsx` or a child component
- server route under `app/api/` for chat completion / retrieval
- shared AI orchestration helper under `lib/ai/` or a new `lib/bioremediation/`
- SQL migration for curated case memory if cases must be editable or queryable

That approach would preserve current architectural conventions instead of embedding AI calls directly in the browser component.
