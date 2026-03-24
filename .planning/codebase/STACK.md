# Stack

## Summary

AquaData is a brownfield web application for aquaculture operations built on `Next.js 16` with the App Router, `React 19`, and `TypeScript`. It uses `Supabase` for auth and Postgres access, `Tailwind CSS` plus shadcn-style UI primitives for presentation, and the `Vercel AI SDK` with a provider factory for OCR and future AI-assisted features.

## Core Runtime

- Runtime: Node.js app managed with `pnpm`
- Framework: `next@16.1.6`
- UI: `react@19`, `react-dom@19`
- Language: `typescript@5.7.3`
- Styling: `tailwindcss`, `tailwindcss-animate`, utility-first styling in JSX
- Build scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`

## Frontend Stack

- Routing and layouts live under `app/`
- Feature UI lives under `components/`
- Reusable primitives live under `components/ui/`
- Forms rely on `react-hook-form` and `@hookform/resolvers`
- Validation uses `zod`
- Icons use `lucide-react`
- Data visualization uses `recharts`
- Theme handling uses `next-themes`

Key examples:
- `app/layout.tsx` configures the root app shell
- `app/dashboard/layout.tsx` and `app/admin/layout.tsx` define protected shells
- `components/bioremediation-form.tsx` is a representative interactive client form

## Backend and Data Stack

- Auth and database client libraries: `@supabase/ssr`, `@supabase/supabase-js`
- Server Supabase factory: `lib/supabase/server.ts`
- Browser Supabase factory: `lib/supabase/client.ts`
- Request/session proxy: `lib/supabase/proxy.ts`
- Schema and migrations are SQL-first in `scripts/`

Relevant schema files:
- `scripts/001_create_schema.sql`
- `scripts/003_market_prices_table.sql`
- `scripts/005_water_quality_fields.sql`
- `scripts/010_admin_module.sql`
- `scripts/015_organization_update_policy.sql`

## AI and Automation Stack

- Core AI SDK: `ai`
- Google provider package: `@ai-sdk/google`
- Provider selector: `lib/ai/provider.ts`
- OCR entrypoint: `app/api/ocr/route.ts`

Current provider configuration:
- `lib/ai/provider.ts` sets `ACTIVE_PROVIDER` to `google`
- OCR currently uses `google('gemini-2.5-flash')`
- Alternate catalog entries exist for Anthropic and OpenAI through gateway-style model IDs

## Operational Libraries

- Spreadsheet export/import: `xlsx`
- PDF generation: `jspdf`, `jspdf-autotable`
- Drag-and-drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

Examples:
- `components/records-export.tsx`
- `components/admin/csv-export-button.tsx`
- `components/ponds-sortable-grid.tsx`

## Configuration Files

- Package manifest: `package.json`
- TypeScript config: `tsconfig.json`
- Next.js config: `next.config.mjs`
- Tailwind config: `tailwind.config.ts`
- PostCSS config: `postcss.config.mjs`
- shadcn component config: `components.json`

Notable config decisions:
- `next.config.mjs` sets `typescript.ignoreBuildErrors = true`
- `next.config.mjs` also sets `images.unoptimized = true`
- Turbopack root is pinned explicitly in `next.config.mjs`

## Environment Variables

Known env vars referenced in repo docs and code:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Primary references:
- `README.md`
- `CLAUDE.md`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`

## Build and Quality Baseline

- Linting exists through `eslint .`
- No automated test framework is configured
- The documented minimum validation is `pnpm lint` plus `pnpm build`
- Production build currently tolerates TypeScript errors because of `ignoreBuildErrors`

## Stack Implications

- This is a full-stack monorepo-style single app, not a separated frontend/backend deployment
- The repo is already AI-capable, so adding a chatbot to bioremediation should extend existing provider patterns instead of introducing a disconnected integration
- Supabase is the operational source of truth, so any experience-memory or case-library feature should likely align with existing SQL migration patterns in `scripts/`
