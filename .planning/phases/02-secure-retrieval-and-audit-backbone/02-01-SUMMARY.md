---
phase: 02-secure-retrieval-and-audit-backbone
plan: 01
subsystem: database
tags: [supabase, postgres, zod, retrieval, audit, rls]
requires:
  - phase: 01-case-library-governance
    provides: approved bioremediation cases and grounding eligibility flags
provides:
  - tenant-scoped bioremediation chat session and message persistence
  - shared calculator, citation, and message contracts for grounded chat
  - deterministic approved-case retrieval with low-evidence signaling
affects: [phase-02-route-layer, phase-03-calculator-chat-ui, audit-review]
tech-stack:
  added: []
  patterns:
    - SQL-first chat persistence with organization-scoped RLS
    - shared Zod contracts for calculator and chat payloads
    - deterministic retrieval before any model invocation
key-files:
  created:
    - scripts/021_bioremediation_chat.sql
    - lib/bioremediation-chat/schema.ts
    - lib/bioremediation-chat/types.ts
    - lib/bioremediation-chat/retrieval.ts
  modified: []
key-decisions:
  - "Chat persistence stores organization_id, calculator context snapshots, and escalation flags directly on auditable rows."
  - "Retrieval only reads approved and grounding-eligible cases, then applies structured product and species filters before ranking."
patterns-established:
  - "Server-only evidence retrieval lives in lib/bioremediation-chat and returns ranked candidates plus exclusion reasons."
  - "Calculator context is normalized once and reused across storage, retrieval, and later route/UI work."
requirements-completed: [SAFE-02, SAFE-03, SAFE-04, SAFE-05, AUD-01, AUD-02]
duration: 3min
completed: 2026-03-24
---

# Phase 2 Plan 01: Secure Retrieval and Audit Backbone Summary

**Tenant-safe chat persistence with approved-case retrieval, shared calculator contracts, and explicit audit traces for bioremediation assistance**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T22:03:42-05:00
- **Completed:** 2026-03-24T22:06:55-05:00
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `bioremediation_chat_sessions` and `bioremediation_chat_messages` with organization-aware RLS and audit fields.
- Defined shared Zod contracts and TypeScript types for calculator context, citations, chat messages, and retrieval results.
- Implemented a server-only retrieval helper that enforces approved grounding eligibility before deterministic ranking.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the audit-ready chat persistence model** - `0a12899` (feat)
2. **Task 2: Define shared calculator-chat contracts** - `6c3b199` (feat)
3. **Task 3: Implement approved-case retrieval and deterministic ranking** - `cf85b9e` (feat)

**Plan metadata:** Included in the final docs commit for this plan.

## Files Created/Modified
- `scripts/021_bioremediation_chat.sql` - Adds tenant-scoped chat sessions and messages with audit fields, indexes, and RLS policies.
- `lib/bioremediation-chat/schema.ts` - Defines normalized calculator context, citation, session, and message schemas.
- `lib/bioremediation-chat/types.ts` - Exports typed chat, citation, and retrieval result interfaces for later route and UI work.
- `lib/bioremediation-chat/retrieval.ts` - Queries approved grounding cases, applies structured filters, ranks evidence, and returns low-evidence signals.

## Decisions Made
- Stored `organization_id` and `calculator_context` on both session and message rows so tenant isolation and replay do not depend on inferred joins alone.
- Kept retrieval SQL limited to approved, grounding-eligible rows and handled fuzzy structured matching in TypeScript to preserve deterministic filtering while tolerating normalized calculator values.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm lint` is currently not runnable in this repository because `package.json` defines `eslint .` without `eslint` in `devDependencies`. Logged in `.planning/phases/02-secure-retrieval-and-audit-backbone/deferred-items.md`.
- `pnpm build` intermittently fails inside the sandbox because Next.js fetches Google Fonts during build. Verification succeeded when rerun outside the sandbox.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 plan 02 can now build the authenticated route and provider orchestration on top of fixed persistence and retrieval contracts.
- The remaining route work still needs to satisfy `SAFE-01` and `CHAT-06`.

## Self-Check

PASSED

- Verified created artifacts exist on disk.
- Verified task commits `0a12899`, `6c3b199`, and `cf85b9e` exist in git history.

---
*Phase: 02-secure-retrieval-and-audit-backbone*
*Completed: 2026-03-24*
