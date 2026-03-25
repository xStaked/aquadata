---
phase: 1
slug: case-library-governance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `pnpm lint` |
| **Full suite command** | `pnpm lint && pnpm build` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint`
- **After every plan wave:** Run `pnpm lint && pnpm build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | CASE-01 | manual smoke + static | `pnpm lint && pnpm build` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | CASE-03 | manual smoke + static | `pnpm lint && pnpm build` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | CASE-02 | manual smoke + static | `pnpm lint && pnpm build` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | CASE-04 | manual smoke + static | `pnpm lint && pnpm build` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | OPS-01 | manual smoke + static | `pnpm lint && pnpm build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `manual admin smoke checklist` — explicit steps for create, edit, approve, retire, filter, reload persistence, and unauthorized access redirect
- [ ] `case-library CRUD verification notes` — document how to validate server actions and RLS behavior in `pnpm dev`
- [ ] `existing infrastructure covers lint/build only` — do not assume unit or integration tests exist for this phase

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create a case with all required structured fields | CASE-01 | No automated form or server-action test harness exists | In `pnpm dev`, sign in as admin, open the case library screen, create a case with issue, zone, species, product, treatment approach, dose, outcome, and status, save, reload, and confirm values persist in the list/detail UI |
| Edit an existing case and see latest saved values after returning | CASE-02 | No end-to-end coverage is configured | Edit a saved case, change at least two structured fields, save, navigate away and back, then confirm the latest values are shown |
| Move a case between draft, approved, and retired while only approved is marked usable for grounding | CASE-03 | Publication-state semantics are UI and data coupled | Transition one case through all three statuses, confirm badges/filters update, and confirm only `approved` rows are labeled usable for assistant grounding in the admin surface |
| Review authorship, last review date, and publication state while managing cases | CASE-04 | Metadata display depends on live DB writes and UI formatting | Confirm the table/form shows author, last review date, and status for an existing case after create and after approval/retirement |
| Manage the library inside the existing admin surface | OPS-01 | Admin-shell integration and auth redirects are not covered by tooling | Access the case library through `/admin`, confirm it uses the existing admin shell, and verify a non-admin session is redirected or denied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
