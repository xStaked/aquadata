# Deferred Items

## 2026-03-25

- `components/monthly-feed-form.tsx`: `pnpm exec tsc --noEmit` still fails on pre-existing `production_stage` narrowing errors at lines 214, 437, and 616. This is outside Plan 02-02 scope.
- Repository lint baseline: `pnpm lint` cannot run because the workspace has no local `eslint` binary and no ESLint config file. This is an existing verification gap outside Plan 02-02 scope.
