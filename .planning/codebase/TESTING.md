# Testing

## Current State

There is no automated test framework configured in the repository today.

Direct evidence:
- `README.md` says the repo does not yet have an automated test framework
- `CLAUDE.md` says "No test framework is configured"
- `package.json` has no `test` script
- repository search shows no active `*.test.*` or `*.spec.*` files in app code

## Existing Validation Workflow

The documented minimum validation is:
- `pnpm lint`
- `pnpm build`
- manual verification in `pnpm dev`

Reference:
- `AGENTS.md`
- `README.md`

## Important Caveat

The build is not a strict quality gate right now because:
- `next.config.mjs` sets `typescript.ignoreBuildErrors = true`

That means:
- `pnpm build` can succeed even if TypeScript regressions exist
- lint and manual testing carry more weight than they normally should

## Observed Testing Patterns

What exists today is manual and feature-driven:
- route handlers rely on hand testing through UI flows
- client forms rely on user interaction verification
- SQL changes appear to be validated against Supabase manually

Examples of flows likely tested manually:
- OCR upload flow via `components/upload-form.tsx` and `app/api/ocr/route.ts`
- bioremediation calculator via `components/bioremediation-form.tsx`
- market price sync via `app/api/market-prices/sync/route.ts`

## Coverage Gaps

High-risk untested areas:
- auth redirects and role routing
- OCR parsing contract changes
- SQL schema compatibility with frontend assumptions
- local calculation logic in `hooks/use-bioremediation.ts`
- admin/operator access separation

## Existing Assets That Could Support Tests

Useful seams for future tests:
- pure calculation helper `calculateDose()` in `hooks/use-bioremediation.ts`
- provider accessor functions in `lib/ai/provider.ts`
- parsing logic in `lib/sipsa/client.ts`
- route handlers under `app/api/`

These are good candidates for the first unit tests because they have clear inputs and outputs.

## Recommended First Testing Layer

If automated tests are added, the highest-value starting points are:
- unit tests for `calculateDose()` edge cases
- unit tests for `parseSipsaXml()`
- contract tests for `app/api/ocr/route.ts` using mocked AI responses
- route or component tests around auth redirects and protected layouts

## Manual Regression Checklist For Current Repo

At minimum, feature work should manually verify:
- login and dashboard redirect behavior
- admin redirect behavior
- create/save flows for affected forms
- any route handler returning JSON errors
- Spanish copy and number/date formatting on impacted screens

## Implications For Upcoming Planning

Any phase that introduces a bioremediation chatbot should budget explicit verification work because:
- there is no automated safety net
- AI-assisted features have prompt/output drift risk
- the app already contains route-level and client-level logic splits that are easy to regress without tests
