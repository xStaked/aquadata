# Concerns

## Summary

The codebase is workable and coherent for an MVP, but several concerns raise planning and execution risk: weak type-enforcement in production builds, sparse automated testing, inconsistent user-facing error handling, and feature logic that is beginning to sprawl across UI, hooks, routes, and SQL without a stronger service boundary.

## Severity: High

## TypeScript errors can ship

Evidence:
- `next.config.mjs` sets `typescript.ignoreBuildErrors = true`

Why it matters:
- build success is not proof of correctness
- refactors can silently accumulate type debt
- planning agents cannot rely on `pnpm build` as a hard gate

## No automated tests

Evidence:
- no `test` script in `package.json`
- repo docs explicitly state there is no test framework
- no meaningful test files detected

Why it matters:
- regressions in auth, calculations, and AI routes are likely to be caught late
- manual verification cost grows as features expand

## Severity: Medium

## Client-side persistence mixed with business logic

Evidence:
- `hooks/use-bioremediation.ts` both calculates dose and writes directly to `bioremediation_calcs`

Why it matters:
- richer validation or audit logic becomes harder to centralize
- future chat recommendations tied to case history may need server-side policy enforcement

## Inconsistent error UX

Evidence:
- `hooks/use-bioremediation.ts` uses `alert('Error al guardar el cálculo')`
- `components/pond-actions.tsx` uses browser alerts for failures
- routes mostly return JSON errors without a unified client-handling pattern

Why it matters:
- user experience is uneven
- error recovery becomes inconsistent across features

## AI integration abstraction is only partially generalized

Evidence:
- `lib/ai/provider.ts` supports provider switching
- only OCR currently uses that abstraction directly in `app/api/ocr/route.ts`

Why it matters:
- a new DeepSeek chatbot could be bolted on in an ad hoc way if not planned carefully
- provider expansion may require architectural decisions instead of a quick UI-only patch

## Severity: Medium to Low

## Market-price integration is partly simulated

Evidence:
- `app/api/market-prices/sync/route.ts` upserts curated in-code prices
- SIPSA live call is only used as a connectivity ping
- `lib/market-data.ts` falls back to mock data

Why it matters:
- product expectations can drift from real-time data assumptions
- operational trust depends on documenting what is truly live versus reference data

## Schema compatibility shortcuts exist

Evidence:
- `hooks/use-bioremediation.ts` comments that the current schema still requires length and width, so area is stored as `pond_length` and width is hardcoded to `1`

Why it matters:
- domain model and UI model are slightly misaligned
- future analytics or chatbot retrieval based on saved calculations may inherit awkward data semantics

## Performance / Maintainability Watchpoints

- Large feature components such as `components/bioremediation-form.tsx` are already fairly dense and will become harder to evolve if chat UI is inserted inline without decomposition
- Flat `components/` and mixed responsibilities can make ownership blurry as the product grows
- SOAP parsing in `lib/sipsa/client.ts` is pragmatic but brittle if upstream payload shape changes

## Security / Compliance Watchpoints

- No secret leakage was observed in source files reviewed, but future codebase-map commits should still be scanned before commit
- Any AI chat feature that stores real field cases needs clear decisions about tenant boundaries, personally identifiable farm context, and admin edit permissions
- Dashboard AI routes should remain authenticated if they expose farm-specific recommendations

## Planning Implications

A bioremediation chatbot phase should explicitly account for:
- provider strategy: extend existing `lib/ai/provider.ts` or isolate DeepSeek separately
- persistence strategy for curated real-world cases
- authenticated routing and RLS-safe data access
- UX strategy for uncertainty, case references, and fallback-to-LLM behavior
- verification strategy beyond `pnpm build`
