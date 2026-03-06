# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes (`app/api/*/route.ts`).
- `components/`: feature UI components; shared primitives live in `components/ui/` (shadcn-style).
- `lib/`: server/client integrations and domain utilities (Supabase, AI providers, formatting, market data).
- `hooks/`: reusable React hooks.
- `scripts/`: SQL schema and data scripts (`001_create_schema.sql`, `002_seed_demo_data.sql`, etc.).
- `public/` and `styles/`: static assets and global styles.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local development server with hot reload.
- `npm run build`: produce production build and catch type/build issues.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint across the repository.

Use from repository root:

```bash
npm run dev
npm run lint && npm run build
```

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`) with `strict` mode enabled.
- Indentation: 2 spaces; prefer small, focused components and hooks.
- Components: PascalCase file names for feature components (e.g., `HarvestForm.tsx` pattern), lowercase for route files (`page.tsx`, `layout.tsx`).
- Imports: use alias paths like `@/components`, `@/lib`, `@/hooks`.
- Styling: Tailwind CSS utilities in JSX; keep shared UI patterns in `components/ui/`.

## Testing Guidelines
- There is currently no automated test framework configured.
- Minimum validation for each change:
  - `npm run lint`
  - `npm run build`
  - Manual verification of affected flows in `npm run dev`.
- If adding tests, co-locate as `*.test.ts(x)` near the module and document run commands in `package.json`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat: ...`, `fix: ...`, `style: ...`.
- Keep commits atomic and scoped (one feature/fix per commit).
- PRs should include:
  - concise description and motivation,
  - linked issue/task,
  - screenshots or short video for UI changes,
  - notes for DB changes (which `scripts/*.sql` file is added/updated).

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit credentials.
- Review API route changes for auth checks and avoid exposing service-role keys client-side.
