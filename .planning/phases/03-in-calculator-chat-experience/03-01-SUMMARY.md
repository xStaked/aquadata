---
phase: 03-in-calculator-chat-experience
plan: 01
subsystem: bioremediation-chat-ui
tags: [chat, calculator, client-hook, panel, integration]
dependency_graph:
  requires:
    - 02-02-PLAN.md  # Protected chat route and service contract
  provides:
    - hooks/use-bioremediation-chat.ts  # Client-side chat state and orchestration
    - components/bioremediation-chat-panel.tsx  # Embedded assistant panel shell
    - components/bioremediation-form.tsx  # Updated calculator form with panel mounted
  affects:
    - app/dashboard/bioremediation/page.tsx  # Indirect — through form component
tech_stack:
  added: []
  patterns:
    - Client hook separates chat state from rendering (same pattern as use-bioremediation.ts)
    - Panel receives all state as props — no internal fetch calls
    - crypto.randomUUID() used for client-side IDs (no uuid dependency added)
    - Calculator context serialized to JSON and POSTed to /api/bioremediation/chat on each send
key_files:
  created:
    - hooks/use-bioremediation-chat.ts
    - components/bioremediation-chat-panel.tsx
  modified:
    - components/bioremediation-form.tsx
decisions:
  - Panel receives props from hook; no direct fetch calls inside the panel component
  - crypto.randomUUID() used rather than adding uuid package dependency
  - Chat panel placed as a dedicated section below the reference table, after the result card
  - useBioremediationChat accepts all calculator form fields so it can rebuild context on each send without requiring a calculated result first
metrics:
  duration: 5min
  completed: "2026-03-25"
  tasks_completed: 3
  files_changed: 3
---

# Phase 3 Plan 1: Embedded Calculator Assistant Shell Summary

Client-side chat hook and panel embedded directly in the bioremediation calculator, automatically passing active calculator context (product, species, area, depth, age, density, aeration, finalDoseG) to the Phase 2 protected backend on every question.

## What Was Built

### Task 1 — Calculator-chat state hook (`hooks/use-bioremediation-chat.ts`)

A focused client hook that owns all conversation state: messages, draft, isSending, sessionId, error, and a derived calculatorContext. On `sendMessage()` it serializes the active calculator form state into the backend schema shape and calls `POST /api/bioremediation/chat`. Response kinds `answer`, `clarify`, and `escalate` are treated as typed first-class states rather than raw text strings. Session continuity is maintained across turns by storing the server-returned sessionId.

### Task 2 — Embedded assistant panel (`components/bioremediation-chat-panel.tsx`)

A bounded panel shell that renders message threads, a textarea composer (Enter to send, Shift+Enter for newline), loading and empty states, and a compact context summary (producto, especie, aireación, dosis calculada) when calculator inputs are filled. Response kinds map to distinct visual badges. Citations render as compact case cards showing coincidence score, dose applied, and outcome. A calculator guardrail note appears on each assistant answer to preserve the deterministic calculator authority.

### Task 3 — Calculator integration (`components/bioremediation-form.tsx`)

The BioremediationChatPanel is mounted below the species reference table as a dedicated Asistente Aquavet section. `useBioremediationChat` is wired with all live calculator state so context is always current. The existing "Calcular dosis" and "Guardar cálculo" controls are unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all panel fields are wired to live calculator state and backend responses. The panel correctly shows empty/loading states when no messages exist or when no calculator context is available.

## Self-Check

### Files created/modified:

- [x] `hooks/use-bioremediation-chat.ts` — FOUND
- [x] `components/bioremediation-chat-panel.tsx` — FOUND
- [x] `components/bioremediation-form.tsx` — FOUND (modified)

### Commits:

- [x] c41683b — feat(03-01): build calculator-chat state hook
- [x] ab5d601 — feat(03-01): create embedded assistant panel
- [x] 62c86ed — feat(03-01): integrate assistant panel into calculator workflow

## Self-Check: PASSED
