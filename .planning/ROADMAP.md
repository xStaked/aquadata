# Roadmap: AquaVet Operations Platform

## Overview

This roadmap extends the existing AquaVet platform with a bounded bioremediation assistant inside the current calculator workflow. The delivery path follows the product dependency chain: first make Aquavet's field knowledge governable, then build a safe retrieval and audit layer around it, then expose that capability in the producer calculator, and finally gate rollout with evaluation and scope controls.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Case Library Governance** - Aquavet can manage an approved, reviewable bioremediation case corpus from the admin workflow. (completed 2026-03-25)
- [ ] **Phase 2: Secure Retrieval and Audit Backbone** - Chat requests are processed safely server-side with grounded retrieval, session isolation, DeepSeek invocation, and audit traces.
- [ ] **Phase 3: In-Calculator Chat Experience** - Producers can use a bounded DeepSeek assistant inside the calculator with structured answers, clarifications, escalation, and feedback.
- [ ] **Phase 4: Evaluation and Rollout Controls** - Aquavet can validate supported questions and keep the feature positioned as a scoped calculator assistant.

## Phase Details

### Phase 1: Case Library Governance
**Goal**: Aquavet can curate, review, and maintain the case library through the existing admin interface so only governed field knowledge is eligible for assistant grounding.
**Depends on**: Nothing (first phase)
**Requirements**: CASE-01, CASE-02, CASE-03, CASE-04, OPS-01
**Success Criteria** (what must be TRUE):
  1. Aquavet admin can create a bioremediation case with the required structured fields for issue, zone, species, product, treatment approach, dose, outcome, and status.
  2. Aquavet admin can edit an existing case from the product without database access and see the latest saved values when they return.
  3. Aquavet admin can move a case between draft, approved, and retired states, and only approved cases are marked as usable for assistant grounding.
  4. Aquavet admin can review authorship, last review date, and current publication state for each case while managing the library.
**Plans**: 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Create the governed case-library schema, types, and admin-only write contract
- [x] 01-02-PLAN.md — Deliver the admin case-library management surface and manual validation checklist
**UI hint**: yes

### Phase 2: Secure Retrieval and Audit Backbone
**Goal**: Producer chat requests are handled through a tenant-safe server pipeline that uses calculator context, cites only approved evidence, and preserves the deterministic calculator as the numeric authority.
**Depends on**: Phase 1
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, AUD-01, AUD-02, CHAT-06
**Success Criteria** (what must be TRUE):
  1. An authenticated producer question is processed through a server-side route that uses the active calculator context without exposing direct model calls in the browser.
  2. The retrieval pipeline filters candidate evidence by structured context such as product, species, zone, and approval status before the assistant forms an answer.
  3. Every stored answer includes the cited approved case IDs, confidence state, and whether the interaction required escalation or was low confidence.
  4. Producer chat sessions and message history remain isolated to the correct tenant and retain the related calculator context for later review.
  5. The calculator remains the visible numeric source of truth, and assistant responses do not silently replace deterministic calculator outputs.
**Plans**: 1/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Create the tenant-safe chat persistence, shared contracts, and approved-case retrieval layer
- [x] 02-02-PLAN.md — Implement the server-side DeepSeek adapter, grounded orchestration service, and authenticated chat route

### Phase 3: In-Calculator Chat Experience
**Goal**: Producers can ask punctual bioremediation questions inside the existing calculator and receive structured, case-grounded guidance with clear uncertainty handling.
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, AUD-03
**Success Criteria** (what must be TRUE):
  1. A producer can open the assistant directly inside the existing bioremediation calculator workflow without leaving the calculator task.
  2. A producer can ask a dosage or troubleshooting question and have the current calculator context automatically inform the answer.
  3. When key context is missing or ambiguous, the assistant asks a narrow clarifying question instead of guessing.
  4. The assistant returns a structured response with recommendation, rationale, confidence, and cited Aquavet case references, or explicitly declines and routes the producer to Aquavet support when no safe grounded answer exists.
  5. Producer or Aquavet can capture basic usefulness feedback on the answer from the product interface.
**Plans**: 2/2 plans ready
Plans:
- [ ] 03-01-PLAN.md — Embed the assistant into the current calculator workflow with automatic calculator-context handoff
- [ ] 03-02-PLAN.md — Render structured answer states and capture per-answer usefulness feedback
**UI hint**: yes

### Phase 4: Evaluation and Rollout Controls
**Goal**: Aquavet can validate the assistant against known question sets and release it as a tightly scoped calculator aid rather than a general-purpose chatbot.
**Depends on**: Phase 3
**Requirements**: OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. Aquavet can run a repeatable evaluation set of supported chatbot questions before rollout and inspect whether the assistant meets the expected response contract.
  2. Producers only encounter the assistant as targeted bioremediation consultation inside the calculator, not as a general-purpose assistant elsewhere in the platform.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Case Library Governance | 2/2 | Complete | 2026-03-25 |
| 2. Secure Retrieval and Audit Backbone | 1/2 | In Progress | - |
| 3. In-Calculator Chat Experience | 2/2 | Planned | - |
| 4. Evaluation and Rollout Controls | 0/TBD | Not started | - |
