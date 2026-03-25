# Requirements: AquaVet Operations Platform

**Defined:** 2026-03-24
**Core Value:** Operational reports must turn into useful technical guidance and commercial insight without requiring a human from Aquavet to answer every routine question.

## v1 Requirements

### Case Library

- [x] **CASE-01**: Aquavet admin can create a structured bioremediation case with required fields for issue, zone, species, product, treatment approach, dose, outcome, and status
- [x] **CASE-02**: Aquavet admin can edit and update an existing bioremediation case without direct database access
- [x] **CASE-03**: Aquavet admin can mark a case as draft, approved, or retired so only approved cases are eligible for chatbot grounding
- [x] **CASE-04**: The system stores review metadata for each case, including author, last review date, and current publication status

### Chat Experience

- [x] **CHAT-01**: Producer can open a chatbot inside the existing bioremediation calculator workflow
- [x] **CHAT-02**: Producer can ask a punctual dosage or troubleshooting question using the active calculator context as grounding input
- [x] **CHAT-03**: The chatbot can ask a narrow clarifying question when required context is missing or ambiguous
- [x] **CHAT-04**: The chatbot returns answers in a structured format that includes recommendation, rationale, confidence, and cited Aquavet case references
- [x] **CHAT-05**: The chatbot can explicitly decline to answer and direct the producer to Aquavet support when no safe grounded answer exists
- [x] **CHAT-06**: The chatbot preserves the existing deterministic calculator as the numeric source of truth and does not silently replace calculator logic

### Retrieval and Safety

- [x] **SAFE-01**: Chat requests are processed through an authenticated server-side route and never call the model directly from the browser
- [x] **SAFE-02**: The retrieval pipeline filters candidate cases by structured context such as product, species, zone, and publication status before ranking answers
- [x] **SAFE-03**: The system only cites approved Aquavet cases in chatbot answers
- [x] **SAFE-04**: The system records the cited case IDs and confidence state for every chatbot answer
- [x] **SAFE-05**: The system prevents cross-tenant exposure of producer chat sessions and organization data

### Audit and Feedback

- [x] **AUD-01**: The system stores each producer chat session and message history with the related calculator context
- [x] **AUD-02**: The system stores whether an answer required escalation or was considered low confidence
- [x] **AUD-03**: Producer or Aquavet can capture basic feedback on chatbot usefulness to support future case-library improvement

### Operations and Quality

- [x] **OPS-01**: Aquavet can review and manage the case library from the existing admin surface
- [ ] **OPS-02**: The project defines a repeatable evaluation set for supported chatbot questions before rollout
- [ ] **OPS-03**: The rollout plan limits the chatbot to targeted bioremediation consultation inside the calculator and does not present it as a general-purpose assistant

## v2 Requirements

### Chat Enhancements

- **CHATX-01**: The chatbot can show a best-match panel explaining why a cited case is similar to the current pond context
- **CHATX-02**: The chatbot can adapt a cited case into an "applied to your pond" explanation beyond the basic structured answer
- **CHATX-03**: The chatbot can reuse prior saved calculations as optional context for follow-up questions
- **CHATX-04**: The chatbot can support multimodal follow-ups such as image-based troubleshooting inside the chat flow

### Admin and Governance

- **GOV-01**: Aquavet admin can review failed or escalated questions in a dedicated queue
- **GOV-02**: Aquavet admin can inspect retrieval traces and transcript history for debugging
- **GOV-03**: Aquavet can segment case visibility by region or organization if the business later requires it

## Out of Scope

| Feature | Reason |
|---------|--------|
| General farm-management chatbot | This cycle is focused on punctual bioremediation consultation inside the calculator |
| Replacing the current calculator with chat-only input | The structured calculator is already the safest and most efficient source of context |
| Unstructured bulk upload of anecdotes as chatbot knowledge | The feature requires governed, reviewable case data instead of freeform notes |
| Full OCR-driven chat ingestion workflow | OCR exists already but is not the primary deliverable of this feature cycle |
| Autonomous diagnosis with no uncertainty or escalation | The product must preserve reference guidance semantics and safe fallback to Aquavet staff |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CASE-01 | Phase 1 | Complete |
| CASE-02 | Phase 1 | Complete |
| CASE-03 | Phase 1 | Complete |
| CASE-04 | Phase 1 | Complete |
| CHAT-01 | Phase 3 | Complete |
| CHAT-02 | Phase 3 | Complete |
| CHAT-03 | Phase 3 | Complete |
| CHAT-04 | Phase 3 | Complete |
| CHAT-05 | Phase 3 | Complete |
| CHAT-06 | Phase 2 | Complete |
| SAFE-01 | Phase 2 | Complete |
| SAFE-02 | Phase 2 | Complete |
| SAFE-03 | Phase 2 | Complete |
| SAFE-04 | Phase 2 | Complete |
| SAFE-05 | Phase 2 | Complete |
| AUD-01 | Phase 2 | Complete |
| AUD-02 | Phase 2 | Complete |
| AUD-03 | Phase 3 | Complete |
| OPS-01 | Phase 1 | Complete |
| OPS-02 | Phase 4 | Pending |
| OPS-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-25 after Phase 1 completion*
