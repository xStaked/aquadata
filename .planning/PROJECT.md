# AquaVet Operations Platform

## What This Is

This is a brownfield operational platform for Aquavet and its aquaculture producers. Producers use it to register pond-level operational reports, review reference calculations for costs and expected earnings, and access tools like the bioremediation calculator without depending on direct back-and-forth with the Aquavet team. Aquavet uses an admin panel to monitor each client with a specific focus on bioremediation needs and commercial opportunities.

## Core Value

Operational reports must turn into useful technical guidance and commercial insight without requiring a human from Aquavet to answer every routine question.

## Requirements

### Validated

- ✓ Producers can authenticate and access protected dashboard workflows — existing
- ✓ Producers can register pond and operational data that feed reporting workflows — existing
- ✓ Producers can capture report data covering feeding, biometric, water quality, and related farm inputs — existing
- ✓ The platform computes pond-level operational references, costs, and profitability projections — existing
- ✓ The system integrates SIPSA reference pricing into commercial and analytics workflows — existing
- ✓ Aquavet staff can monitor client operations from an admin-focused bioremediation panel — existing
- ✓ Producers can use the bioremediation calculator to resolve dosing questions without always contacting Aquavet staff — existing
- ✓ The product already includes OCR infrastructure for extracting report information from uploaded images — existing
- ✓ Aquavet can curate governed bioremediation cases from the existing admin workflow, including create, edit, and publication-state management — validated in Phase 1: Case Library Governance
- ✓ An authenticated server-side retrieval and audit pipeline exists that can fetch approved cases for grounded chat responses, enforce tenant safety, and log all interactions — validated in Phase 2: Secure Retrieval and Audit Backbone

### Active

- [ ] Add a chatbot inside the calculator that answers punctual bioremediation questions using curated Aquavet field cases
- [ ] Reduce producer dependence on human support for recurring dosing and troubleshooting questions while keeping answers aligned with Aquavet practice

### Out of Scope

- Building a fully general farm-management rewrite — the current product is already functional and this cycle focuses on a targeted extension
- Replacing producer-reported operational truth with exact accounting or guaranteed profit forecasting — current earnings views are reference estimates only
- Turning OCR into the primary scope of this cycle — OCR exists already and is not the main feature requested right now
- Open-ended consumer-style chat outside punctual technical consultation — the goal is focused operational assistance grounded in Aquavet cases

## Context

Aquavet sells bioremediation products to aquaculture producers and needs the product to serve both operational tracking and technical-commercial support. The core data model revolves around pond reports because those reports drive calculations, analytics, sales context, and bioremediation opportunities. The current codebase is a Next.js plus Supabase application with producer and admin surfaces, a SIPSA integration for market-price reference, and an OCR route already in place for report ingestion. The current product is functional; this initialization is for planning incremental improvements requested by the client, not for defining a net-new product from scratch.

## Current State

Phase 1 and Phase 2 are complete. Aquavet now has a governed case-library workflow inside the existing admin bioremediation module. The server-side retrieval and audit backbone is in place: producers can retrieve approved, grounding-eligible cases via a secure server route, all interactions are stored as audit traces, and a producer-facing RLS policy gates case access to `status = 'approved' AND status_usable_for_grounding = true`.

## Constraints

- **Tech stack**: Must extend the existing Next.js 16 + Supabase application — avoid introducing a disconnected backend architecture without clear need
- **Product continuity**: The current system is already in use — new work should preserve existing producer/admin workflows
- **Domain accuracy**: Chatbot answers must align with Aquavet's real field experience and product usage patterns — incorrect dosage guidance creates operational risk
- **Scope discipline**: This cycle is focused on reducing repetitive human consultation through case-grounded AI in the calculator — avoid broadening into unrelated modules
- **Data semantics**: Operational and profitability outputs are reference values, not exact client accounting — wording and UX must preserve that expectation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as a brownfield extension, not a greenfield product definition | The platform already has functional producer/admin workflows in production-like use | — Pending |
| Keep reports as the core system primitive | Reports already drive analytics, sales context, and dosage-related workflows | — Pending |
| Add the new AI experience inside the existing calculator surface | The calculator is already where users go to resolve dosage questions, so the chatbot should reduce support friction in that context | — Pending |
| Ground chatbot responses in curated Aquavet cases | The business goal is to reduce human consultation while keeping advice aligned with proven company practice | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after Phase 1 completion*
