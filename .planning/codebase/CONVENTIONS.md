# Conventions

## Language and Presentation

- Product UI text is primarily in Spanish
- Domain language is aquaculture-specific and operator-facing
- Code comments are sparse and usually reserved for clarifying non-obvious behavior

Examples:
- `components/bioremediation-form.tsx`
- `app/api/ocr/route.ts`
- `README.md`

## TypeScript and Imports

- TypeScript is used across app code
- Path alias `@/` is the normal import style
- Types are often declared inline near the feature using them
- Strict mode is enabled in `tsconfig.json`, but build enforcement is weakened by `next.config.mjs`

Representative files:
- `hooks/use-bioremediation.ts`
- `lib/ai/provider.ts`
- `lib/auth/roles.ts`

## Component Conventions

- Server components are the default inside `app/`
- Interactive components declare `'use client'`
- UI composition relies on Tailwind utility classes directly in JSX
- Shared building blocks come from `components/ui/`

Examples:
- Server component page: `app/dashboard/bioremediation/page.tsx`
- Client form: `components/bioremediation-form.tsx`
- Shared primitive: `components/ui/card.tsx`

## State and Logic Placement

Common pattern:
- simple route shell in `app/`
- interactive UI in `components/`
- reusable feature logic in a hook
- external service access in `lib/`

Example:
- `app/dashboard/bioremediation/page.tsx`
- `components/bioremediation-form.tsx`
- `hooks/use-bioremediation.ts`

## Supabase Usage Rules

The repo explicitly separates server and browser clients:
- browser: `lib/supabase/client.ts`
- server: `lib/supabase/server.ts`

This is a strong convention and should not be violated. `CLAUDE.md` explicitly warns not to mix them.

Auth and role conventions:
- protect general operator surfaces through session-aware layouts
- protect admin surfaces through `requireAdminUser()`

## Styling Conventions

- Tailwind utility classes are preferred over separate CSS modules
- Theme tokens rely on CSS variables and semantic classes such as `bg-background`, `text-foreground`, `text-muted-foreground`
- shadcn-style primitives set the baseline visual language

Relevant files:
- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/*`

## Error Handling Patterns

Current style is inconsistent and pragmatic:
- route handlers usually return JSON errors
- client components sometimes use `alert()` for failure feedback
- some library failures fall back to mock data with `console.warn` or `console.error`

Examples:
- `app/api/ocr/route.ts`
- `app/api/market-prices/sync/route.ts`
- `hooks/use-bioremediation.ts`
- `components/pond-actions.tsx`

## Data and Validation Conventions

- Zod is used where structured AI outputs or form schemas need explicit validation
- Numeric parsing is often done locally with `Number(...)`
- Dates are normalized to ISO strings using `toISOString().split('T')[0]`

Examples:
- `app/api/ocr/route.ts`
- `components/upload-form.tsx`
- `components/manual-record-form.tsx`

## File and Naming Conventions

- Route files are framework-standard lowercase names
- Feature files are descriptive kebab-case
- Utility functions are colocated in the file where they are most needed unless reused
- SQL migration files use numeric ordering prefixes

Examples:
- `app/dashboard/records/actions.ts`
- `components/monthly-feed-form.tsx`
- `scripts/014_report_type.sql`

## Git and Workflow Conventions

Documented in `AGENTS.md`:
- use conventional commits such as `feat:`, `fix:`, `style:`
- keep commits atomic
- validate with `pnpm lint` and `pnpm build`

## Implications For Future Changes

- A new chatbot feature should keep Spanish UX copy
- Shared AI access should likely extend `lib/ai/` instead of embedding provider calls in JSX
- User-visible error handling would benefit from using existing toast patterns instead of adding more `alert()` calls
