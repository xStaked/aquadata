---
status: partial
phase: 03-in-calculator-chat-experience
source: [03-VERIFICATION.md]
started: 2026-03-25T00:00:00Z
updated: 2026-03-25T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. No-context guard — assistant before calculating
expected: Typing a question before filling calculator fields triggers a clarifying response, not a hallucinated answer.
result: [pending]

### 2. Escalation flow
expected: When no safe grounded answer exists, the assistant renders the `EscalateBody` variant with a visible Aquavet support CTA.
result: [pending]

### 3. Clarification flow
expected: When context is ambiguous, the assistant renders the `ClarifyBody` with a follow-up question for the producer.
result: [pending]

### 4. Feedback persistence
expected: Clicking útil / no útil submits exactly once and the feedback column is updated on the assistant message row.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
