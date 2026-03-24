# Structure

## Top-Level Layout

The repository is a single Next.js application with feature folders by concern rather than bounded context packages.

Important top-level locations:
- `app/` — App Router pages, layouts, route handlers, server actions
- `components/` — feature components and shared UI primitives
- `hooks/` — reusable hooks, currently small and feature-focused
- `lib/` — integrations, helpers, domain utilities
- `scripts/` — SQL schema and seed files
- `public/` — static assets such as product images
- `styles/` — additional global styles
- `.planning/` — GSD artifacts once initialized

## App Router Structure

Key route areas:
- `app/auth/` — login, signup, password reset, callback flows
- `app/dashboard/` — operator-facing protected experience
- `app/admin/` — admin-facing protected experience
- `app/api/` — route handlers for OCR, market price sync, organization settings
- `app/tools/` — public tool surfaces

Representative files:
- `app/layout.tsx`
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/bioremediation/page.tsx`
- `app/admin/bioremediation/page.tsx`
- `app/api/ocr/route.ts`

## Components Structure

Feature components live flat under `components/`:
- `components/bioremediation-form.tsx`
- `components/upload-form.tsx`
- `components/manual-record-form.tsx`
- `components/pond-form.tsx`
- `components/analytics-charts.tsx`

Admin-specific components live under:
- `components/admin/`

Reusable UI primitives live under:
- `components/ui/`

This indicates a convention:
- product-level feature components are named in PascalCase-like kebab filenames
- route files remain framework-standard lowercase names such as `page.tsx` and `layout.tsx`

## Hooks Structure

Hooks are limited and generally feature-oriented:
- `hooks/use-bioremediation.ts`
- `hooks/use-mobile.tsx`
- `hooks/use-toast.ts`

The pattern suggests:
- extract reusable stateful logic only when a component becomes meaningfully stateful
- do not create a hook per feature by default

## Lib Structure

`lib/` contains shared logic grouped by subsystem:
- `lib/ai/` — provider selection
- `lib/auth/` — role guards
- `lib/supabase/` — client factories and request proxy
- `lib/sipsa/` — SOAP client
- standalone helpers such as `lib/format.ts`, `lib/fca.ts`, `lib/market-data.ts`, `lib/utils.ts`

This is the most likely location for future feature services that should not live directly in components.

## SQL Structure

The schema evolves via ordered SQL files:
- `scripts/001_create_schema.sql`
- `scripts/002_seed_demo_data.sql`
- `scripts/003_market_prices_table.sql`
- continuing through `scripts/015_organization_update_policy.sql`

Naming pattern:
- numeric prefix for ordering
- descriptive suffix for intent

## Documentation / Agent Guidance

The repo includes agent-facing context files:
- `AGENTS.md`
- `CLAUDE.md`
- localized `CLAUDE.md` files in some subdirectories such as `app/dashboard/bioremediation/CLAUDE.md`

These are useful planning references and part of the repo's working conventions.

## Naming Conventions

- Route files: `page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`
- Aliased imports use `@/`
- Feature files use descriptive kebab-case names like `monthly-feed-form.tsx`
- UI primitives follow shadcn-style lowercase names like `button.tsx`, `card.tsx`, `select.tsx`

## Structural Observations

- There is no `src/` wrapper; imports resolve from project root
- Features are not isolated into domain modules, so cross-feature reuse tends to happen through `lib/` and `components/`
- `app/dashboard/bioremediation/page.tsx` is currently a thin route that delegates the real feature UI to `components/bioremediation-form.tsx`

## Structure Implications For New Work

For a chatbot feature in bioremediation, the repository structure suggests:
- route shell stays in `app/dashboard/bioremediation/page.tsx`
- main interactive widget should live in a new or extended component under `components/`
- shared chat/domain helpers should live in `lib/`
- any persistence additions should arrive as the next numbered SQL script in `scripts/`
