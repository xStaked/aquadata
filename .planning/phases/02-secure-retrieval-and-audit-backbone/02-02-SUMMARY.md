---
phase: 02-secure-retrieval-and-audit-backbone
plan: 02
subsystem: api
tags: [deepseek, supabase, nextjs, app-router, retrieval, audit]
requires:
  - phase: 02-01
    provides: approved-case retrieval, chat persistence tables, shared calculator chat contracts
provides:
  - server-only DeepSeek adapter for grounded bioremediation answers
  - orchestration service that combines retrieval, guardrails, persistence, and normalization
  - authenticated producer chat route for the calculator assistant
affects: [phase-03-ui, chatbot-runtime, audit-review]
tech-stack:
  added: [DeepSeek HTTP adapter via existing runtime fetch]
  patterns: [server-only provider adapter, authenticated route orchestration, grounded-answer normalization]
key-files:
  created:
    - lib/bioremediation-chat/deepseek.ts
    - lib/bioremediation-chat/service.ts
    - app/api/bioremediation/chat/route.ts
  modified:
    - lib/ai/provider.ts
    - lib/bioremediation-chat/schema.ts
    - lib/bioremediation-chat/types.ts
    - lib/bioremediation-chat/retrieval.ts
key-decisions:
  - "DeepSeek stays behind a server-only fetch adapter and reads env-driven base URL, model, and API key from the provider seam."
  - "Low-evidence retrieval never reaches an unsupported answer path; the service clarifies or escalates before returning."
patterns-established:
  - "Authenticated chat routes parse shared request contracts, resolve organization scope, and delegate to one orchestration entrypoint."
  - "Assistant answers persist cited case IDs, confidence, and escalation flags alongside the calculator snapshot used for the response."
requirements-completed: [SAFE-01, SAFE-04, SAFE-05, AUD-01, AUD-02, CHAT-06]
duration: 8min
completed: 2026-03-25
---

# Phase 2 Plan 02: Server Chat Pipeline Summary

**Authenticated grounded bioremediation chat with a server-only DeepSeek adapter, calculator guardrails, and auditable answer persistence**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T03:09:00Z
- **Completed:** 2026-03-25T03:17:09Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added a single DeepSeek integration seam that stays server-side and env-driven.
- Built a grounded orchestration service that retrieves approved evidence, normalizes answer versus clarify versus escalate behavior, and persists audit fields.
- Exposed a protected `/api/bioremediation/chat` route that validates the bounded payload and enforces authenticated organization scope before model invocation.

## Task Commits

1. **Task 1: Add a server-only DeepSeek adapter** - `0dd58f4` (feat)
2. **Task 2: Build the grounded answer orchestration service** - `1b1e352` (feat)
3. **Task 3: Expose the authenticated producer chat route** - `51b7add` (feat)

## Files Created/Modified

- `lib/ai/provider.ts` - Added the DeepSeek env-backed config accessor without changing OCR model selection.
- `lib/bioremediation-chat/deepseek.ts` - Added the server-only DeepSeek JSON adapter and response parsing.
- `lib/bioremediation-chat/schema.ts` - Added shared chat request and response contracts for the route boundary.
- `lib/bioremediation-chat/types.ts` - Exported typed request, response, and retrieval metadata helpers.
- `lib/bioremediation-chat/retrieval.ts` - Applied a minimal typing fix discovered during verification.
- `lib/bioremediation-chat/service.ts` - Added session handling, user and assistant message persistence, retrieval gating, prompt assembly, response normalization, and calculator guardrails.
- `app/api/bioremediation/chat/route.ts` - Added the authenticated App Router endpoint for calculator chat.

## Decisions Made

- DeepSeek request formatting is isolated in `lib/bioremediation-chat/deepseek.ts`, while env resolution stays in `lib/ai/provider.ts`, so future provider swaps remain localized.
- The service returns `clarify` or `escalate` before generation when retrieval has no safe evidence, which preserves calculator authority and prevents unsupported dosage guidance.
- Route validation uses shared Zod contracts so the later calculator UI can serialize `question`, `calculatorContext`, and `sessionId` against one backend contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed retrieval result typing so the Phase 2 backend survives direct TypeScript checking**
- **Found during:** Task 2 verification
- **Issue:** `lib/bioremediation-chat/retrieval.ts` cast the Supabase response directly to `BioremediationCaseRow[]`, which failed under `tsc --noEmit`.
- **Fix:** Narrowed the retrieval data cast through `unknown` to match the current Supabase generic output shape.
- **Files modified:** `lib/bioremediation-chat/retrieval.ts`
- **Verification:** `pnpm exec tsc --noEmit` no longer reports an error in the Phase 2 retrieval files
- **Committed in:** `1b1e352`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The deviation was a small correctness fix inside the existing retrieval contract. No scope creep.

## Issues Encountered

- `pnpm lint` could not run because the workspace currently has no local `eslint` binary and no ESLint config file. This is a pre-existing repo verification gap, not introduced by this plan.
- `pnpm exec tsc --noEmit` still fails in `components/monthly-feed-form.tsx` with pre-existing `production_stage` typing errors unrelated to Phase 2.
- Manual `pnpm dev` verification of authenticated and unsupported chat flows was not executed in this run because no authenticated browser session was established for the new route.

## Auth Gates

None.

## User Setup Required

None - no external service configuration files were generated during this plan. Runtime use still requires `DEEPSEEK_API_KEY` in the environment.

## Next Phase Readiness

- Phase 3 can now call a single protected backend endpoint and expect a normalized structured response with citations, confidence, escalation state, and a calculator guardrail note.
- Before UI rollout, the team still needs authenticated manual verification in `pnpm dev` and the existing repo lint/typecheck baseline should be repaired so future verification can be fully green.

## Self-Check: PASSED

- Found `.planning/phases/02-secure-retrieval-and-audit-backbone/02-02-SUMMARY.md`
- Found commit `0dd58f4`
- Found commit `1b1e352`
- Found commit `51b7add`

---
*Phase: 02-secure-retrieval-and-audit-backbone*
*Completed: 2026-03-25*
