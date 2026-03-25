# Feature Landscape

**Domain:** Case-grounded bioremediation assistant inside the existing calculator workflow
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM

## Scope

This document is intentionally narrow. It covers the product features for a punctual technical chatbot embedded inside the current bioremediation calculator, where the producer already enters pond parameters and wants fast answers to dosage or troubleshooting questions. It does not redefine the full aquaculture platform or propose a general-purpose assistant.

The product goal is not "chat for chat's sake." The goal is to reduce repetitive Aquavet support interactions while keeping recommendations grounded in curated Aquavet field cases and the calculator state already on screen.

## Table Stakes

Features users will expect from a trustworthy in-calculator assistant. Missing any of these will make the chatbot feel unsafe, vague, or operationally annoying.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Context-aware answers from current calculator inputs | Users should not have to restate area, depth, species, age, density, aeration, and selected product in chat | Medium | Access to calculator state; server-side chat route | The assistant should start from the active calculation context and show which values it used |
| Grounded responses tied to curated Aquavet cases | For dosage questions, trust depends on seeing that advice comes from known company practice, not generic model output | High | Case storage, retrieval logic, answer renderer | Each answer should reference the matching case(s), not just produce free text |
| Structured answer format for dosage and troubleshooting | Producers need an actionable answer in seconds, not long prose | Medium | Prompt template; response schema | Recommended structure: answer, why, dose/application steps, confidence, source case(s), next question |
| Clarifying questions when inputs are missing or ambiguous | Safety-critical recommendations degrade quickly when the user omits product, pond condition, or symptom details | Medium | Input validation; response policy | Ask narrow follow-ups like "Is this water-column or pond-bottom treatment?" instead of broad conversation |
| Explicit uncertainty and out-of-scope handling | A grounded assistant must say when it cannot answer from cases instead of improvising | Medium | Confidence logic; UX states | Should explicitly say "No matching Aquavet case found" or "Need advisor review" |
| Human escalation path | Users need a clear next step when the assistant cannot safely answer | Low | Contact CTA or admin routing | Escalation should be one click from the answer card |
| Traceable answer snapshot saved with the calculation | Producers and Aquavet staff need auditability for what was asked, what was answered, and which case grounded it | Medium | Persistence model; auth/RLS | Save question, answer, case IDs, calculator context, timestamp |
| Fast interaction inside the calculator, not a separate support module | The assistant only works if it reduces workflow friction where the user already calculates dose | Low | UI composition in current calculator page | Embed below result or in a side panel tied to the current run |
| Safe wording for reference guidance | Existing platform already treats outputs as references, not guarantees | Low | Copy/UX review | Answers should avoid promise language and preserve "reference recommendation" semantics |

## Differentiators

These features are not required for v1 trust, but they are what make the assistant materially better than a generic RAG chat box.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Best-match case panel with similarity cues | Shows why the system chose a case: same species, density range, aeration condition, zone, or issue pattern | High | Normalized case metadata; retrieval scoring | Better than plain citations because it helps users judge fit |
| "Applied to your pond" delta explanation | Converts a field case into a context-adjusted recommendation tied to the user’s current calculator values | High | Structured case schema; business rules; calculator integration | This is the bridge between case memory and actual calculator utility |
| Admin-authored case templates with required fields | Makes Aquavet knowledge usable and consistent instead of relying on messy free-text case notes | Medium | Admin CRUD; validation schema | Required fields should include issue, product, species, context, treatment approach, dose, outcome, and caution notes |
| Suggested follow-up chips for common punctual questions | Keeps the chat focused on likely next steps such as "repeat dose?", "what if no aeration?", or "what symptom changes should I watch?" | Medium | Intent templates; UI chip system | Prevents drift into open-ended chat |
| Answer mode split: dosage vs troubleshooting | Dosage and troubleshooting have different UX needs; they should not share one generic template | Medium | Intent classification or explicit tabs | Dosage answers should emphasize steps and units; troubleshooting should emphasize likely causes and decision branches |
| Low-confidence fallback that asks for one missing field before escalating | Reduces abandonment while still protecting accuracy | Medium | Confidence thresholds; clarification policy | Example: request ammonia trend or sediment condition before declining |
| Admin feedback loop on unanswered questions | Turns failed chats into case-authoring opportunities for Aquavet | Medium | Logging; admin review queue | This is strategically valuable because it compounds domain knowledge over time |
| Reuse previous saved calculations as context candidates | Lets the assistant answer "same pond as last week, now with less aeration" without starting from zero | High | Historical calc retrieval; permissions | Useful, but only after tenant isolation and audit are solid |

## Anti-Features

These are features the product should deliberately avoid because they would widen scope, reduce trust, or create avoidable operational risk.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| General-purpose farm-management chatbot | It breaks scope discipline and invites unsupported questions about finance, feeding, disease, inventory, and admin tasks | Keep the assistant explicitly scoped to bioremediation dosage and targeted troubleshooting inside the calculator |
| Answers without case references | Uncited answers look hallucinated and are hard for Aquavet to defend internally | Require at least one matched case or explicitly decline/escalate |
| Fully autonomous diagnosis or prescriptive certainty | The app does not have enough validated context to act like an autonomous agronomic decision engine | Present reference guidance with confidence and escalation, not definitive treatment orders |
| Long-form conversational memory across unrelated sessions by default | Persistent memory increases privacy risk, tenant-mixing risk, and wrong-context carryover | Bind context to the active calculation and optionally to explicit prior saved calculations |
| Free-text case ingestion without structure | Unstructured notes make retrieval weak and create inconsistent answers | Force structured case fields and curated summaries before cases are searchable |
| "Always answer" behavior | In safety-sensitive dosage guidance, plausible nonsense is worse than a declined answer | Use confidence thresholds and safe refusal/escalation states |
| Hidden prompt behavior or opaque confidence | Users and admins cannot calibrate trust if they do not know what grounded the answer | Expose source case(s), matched attributes, and confidence tier in the UI |
| Replacing the calculator with chat-only input | The calculator already captures critical structured inputs efficiently; chat-only collection would be slower and less reliable | Keep structured form entry primary and let chat consume that context |
| Broad multimodal support in v1 | Image or voice support expands validation and failure modes without solving the core request first | Start with text plus structured calculator context; add multimodal later only if field evidence justifies it |

## Feature Dependencies

```text
Current calculator state access -> context-aware chat
Curated case schema -> case storage -> retrieval/scoring -> grounded answer with citations
Grounded answer with citations -> confidence display -> safe uncertainty handling
Safe uncertainty handling -> human escalation path
Grounded answer persistence -> admin review queue -> case-library improvement loop
Intent split (dosage vs troubleshooting) -> tailored answer templates -> suggested follow-up chips
```

## MVP Recommendation

Prioritize:

1. Context-aware chat that reads the active calculator inputs
2. Grounded answer card with cited Aquavet cases, structured dosage/troubleshooting output, and explicit uncertainty
3. Human escalation plus saved answer snapshot for auditability

Defer:

- Best-match similarity visualization: valuable for trust, but depends on having a normalized case schema first
- Reuse of historical calculations as context: useful later, but not before access control and audit are proven
- Broad conversational affordances: chips and answer-mode split are good v1.1 enhancements, not day-one blockers

## Practical Product Behavior

The assistant should behave more like an "interactive technical answer card" than a blank chat window. A good interaction looks like this:

1. The producer completes or partially completes a calculation.
2. They ask a punctual question such as "Con esta aireacion, repito la dosis o la divido?" or "Si el fondo sigue negro con BioTerraPro, que reviso primero?"
3. The assistant reads the current calculator state, checks matching Aquavet cases, and either:
   - returns a structured grounded answer with case references, or
   - asks one or two narrow clarifying questions, or
   - declines and escalates when no safe grounded answer exists.
4. The answer is optionally saved with the calculation so producer and Aquavet can review it later.

That interaction model keeps the feature operational, bounded, and high-trust.

## Sources

- AquaVet project context and codebase documents:
  - `.planning/PROJECT.md`
  - `.planning/codebase/CONCERNS.md`
  - `.planning/codebase/ARCHITECTURE.md`
- Microsoft Learn, "Agentic Retrieval - Azure AI Search" (published 2026-02, official documentation). Confidence: MEDIUM. https://learn.microsoft.com/en-us/azure/search/search-agentic-retrieval-concept
- Gloo Docs, "Building a Knowledge-Grounded Chatbot with RAG" (official product documentation, accessed 2026-03-24). Confidence: LOW to MEDIUM. https://docs.gloo.com/tutorials/completions-grounded
- Ayoub et al., "Mind + Machine: ChatGPT as a Basic Clinical Decisions Support Tool" (2023, PubMed/Cureus). Confidence: LOW for direct product design, useful only as caution that decision-support chat needs bounded trust. https://pubmed.ncbi.nlm.nih.gov/37724211/
- Frize et al., "Clinical decision-support systems for intensive care units using case-based reasoning" (2000, PubMed). Confidence: LOW for recency, but still relevant for the value of nearest-case reasoning in high-stakes support workflows. https://pubmed.ncbi.nlm.nih.gov/11259936/
