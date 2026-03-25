# Domain Pitfalls

**Domain:** Aquaculture operations app with a case-grounded bioremediation chatbot
**Researched:** 2026-03-24

## Suggested Phase Anchors

Use these phase topics when mapping the warnings below into roadmap work:

| Phase Topic | Purpose |
|-------------|---------|
| Phase 1: Case Library and Governance | Define case schema, editorial workflow, approval rules, and maintenance ownership |
| Phase 2: Secure Retrieval and Backend Integration | Add storage, indexing, auth, RLS-safe retrieval, and audit logging |
| Phase 3: Trust UX and In-Product Controls | Add citations, scope boundaries, uncertainty handling, escalation paths, and admin review UX |
| Phase 4: Evaluation, Rollout, and Operations | Add evals, monitoring, drift checks, incident playbooks, and staged rollout |

## Critical Pitfalls

### Pitfall 1: Treating field cases like unstructured notes instead of governed operational knowledge
**What goes wrong:** Teams load WhatsApp-style anecdotes, PDFs, or freeform admin notes into the assistant and expect good answers. The model then retrieves inconsistent case fragments, missing dose units, missing pond conditions, and contradictory treatments.

**Why it happens:** Shipping pressure favors "just upload cases" over defining a strict case schema. In this repo that temptation is high because the current calculator logic is deterministic and simple, while a chat feature appears to be "just another UI panel."

**Consequences:** The assistant gives confident but poorly grounded dosage advice, mixes products, or generalizes from incomparable situations. Trust fails fast once one producer spots a mismatch with Aquavet practice.

**Warning signs:**
- Admins cannot answer "what fields are mandatory before a case is publishable?"
- Similar incidents are stored with different wording but no normalized tags.
- Cases omit units, species, aeration state, water-quality context, or outcome.
- Staff correct answers manually in chat because the source case was vague.

**Prevention:** Create a structured case model before building chat retrieval. Minimum fields should include issue/symptom, species, pond or production context, water-quality indicators used in the decision, product, dose with unit, treatment cadence, contraindications, outcome, confidence/approval status, and last-reviewed date. Require editorial states such as `draft`, `approved`, and `retired`. Store the human-readable narrative, but never rely on narrative alone for grounding.

**Detection:** Rising rate of answers that cite cases but still require human correction; many retrieved cases missing core attributes; admins disagreeing on whether two cases mean the same thing.

**Which phase should address it:** Phase 1: Case Library and Governance

### Pitfall 2: Using retrieval without strict scoping to organization, product, and operational context
**What goes wrong:** The chatbot retrieves any vaguely similar case instead of the right case for the current producer, product, and pond conditions. In a brownfield app this often happens when teams bolt a global vector index onto an existing database without preserving tenant and domain filters.

**Why it happens:** Retrieval is treated as a semantic-search problem only. Metadata filters and auth boundaries are added later, if at all.

**Consequences:** Cross-tenant leakage risk, advice based on the wrong species or wrong product, and answers that feel plausible but are operationally unsafe.

**Warning signs:**
- Retrieved context does not always match the selected product in the calculator.
- Cases from one organization can be seen or inferred by another.
- The assistant answers even when key context such as species or aeration is missing.
- Developers cannot explain where auth is enforced: UI, route, SQL, or all three.

**Prevention:** Keep retrieval server-side and make filtering mandatory before semantic ranking. Filter by auth scope, organization visibility, product, species, and case status. If the user has not provided enough context, the assistant should ask clarifying questions or refuse to dose. In this codebase, do not let a client hook directly fetch grounded case context the way `hooks/use-bioremediation.ts` currently writes calculations from the browser.

**Detection:** Internal tests show different answers for the same question depending on unrelated cases added elsewhere; audit logs show retrieval across org boundaries; support tickets mention "the bot talked about a different product than mine."

**Which phase should address it:** Phase 2: Secure Retrieval and Backend Integration

### Pitfall 3: Hiding uncertainty behind polished answers
**What goes wrong:** Teams optimize for "helpful conversational output" and forget that this is operational guidance, not generic chat. The assistant sounds decisive even when the match is weak, the case is stale, or required measurements are missing.

**Why it happens:** Product teams copy consumer-chat UX patterns into a technical-assistant workflow. Models default to answering unless explicitly constrained.

**Consequences:** Producers over-trust weak advice, skip human escalation, and interpret suggestions as approved dosing instructions. One unsafe answer can poison trust in both the calculator and Aquavet.

**Warning signs:**
- Answers rarely say "I don’t have enough grounded evidence."
- No visible distinction between calculator output, retrieved case evidence, and model interpretation.
- Chat sessions have no escalation CTA to contact Aquavet.
- QA reviewers describe the bot as "too sure" or "too polished."

**Prevention:** Make uncertainty first-class in the UX. Show cited cases, last-reviewed dates, and why the answer applies. Separate deterministic calculator output from grounded advisory text. Add explicit refusal rules for missing critical inputs or low-relevance retrieval. Require the model to state when it is extrapolating instead of quoting case evidence.

**Detection:** High user acceptance of advice with low retrieval quality; users stop checking the calculator details; staff report producers quoting the bot as if it were an official prescription.

**Which phase should address it:** Phase 3: Trust UX and In-Product Controls

### Pitfall 4: No evaluation loop for answer quality, only ad hoc spot checks
**What goes wrong:** Teams test a few example prompts, see that the chatbot "basically works," and ship. They do not maintain a gold set of dosage and troubleshooting questions with expected grounded behavior.

**Why it happens:** Existing repo quality gates are weak. `pnpm build` is not a real safety check here because TypeScript build errors are ignored, and there is no automated test suite.

**Consequences:** Silent regressions after prompt tweaks, model changes, schema changes, or case-library growth. The team finds failures in production through support messages rather than evals.

**Warning signs:**
- No pass/fail criteria for "safe to answer" versus "must escalate."
- Prompt changes are merged without replaying a fixed scenario set.
- The team cannot quantify citation accuracy, refusal quality, or wrong-dose rate.
- Model/provider swaps are discussed as low-risk configuration changes.

**Prevention:** Build an eval pack before rollout. Include punctual dosage questions, troubleshooting questions, ambiguous inputs, contradictory-case scenarios, and out-of-scope prompts. Score at least: retrieval relevance, citation correctness, refusal behavior, and instruction adherence. Treat provider/model changes as regression events, not config toggles.

**Detection:** Same prompt produces materially different answers week to week; post-launch issues cluster after prompt or model edits; team debates quality from anecdotes instead of metrics.

**Which phase should address it:** Phase 4: Evaluation, Rollout, and Operations

### Pitfall 5: Letting stale or superseded cases remain eligible for grounding
**What goes wrong:** A case that reflected old Aquavet practice, a temporary product strategy, or an exceptional field situation stays in the retrieval set. The assistant keeps citing it because it is semantically similar, not because it is still valid.

**Why it happens:** Teams create content once and do not fund maintenance. Admin tools focus on creation, not lifecycle.

**Consequences:** The assistant drifts away from current practice while still sounding well grounded. This is especially dangerous for dosing because the answer may be traceable to a real case but still wrong for current operations.

**Warning signs:**
- Cases have no `last_reviewed_at` or `retired_at`.
- Admins cannot bulk-find old cases for reapproval after product or protocol changes.
- Multiple cases conflict but none is marked canonical.
- Support staff say "that used to be true" when reviewing answers.

**Prevention:** Add lifecycle controls: review cadence, versioning, retirement, supersession, and owner assignment. Make only `approved` and not-expired cases retrievable. Surface stale-case warnings in admin. Roadmap-wise, this belongs early, not as a future content-cleanup task.

**Detection:** Retrieved evidence disproportionately comes from the oldest content; admins fix answers by deleting cases manually; quality improves temporarily after manual cleanup and then decays again.

**Which phase should address it:** Phase 1: Case Library and Governance

### Pitfall 6: Mixing deterministic dosing logic with generative advice without a clear authority boundary
**What goes wrong:** The chat answer restates or adjusts dosage in ways that diverge from the existing calculator logic. Users cannot tell whether the calculator number or the chatbot sentence is the source of truth.

**Why it happens:** Brownfield teams insert AI into an existing feature without defining precedence rules. The current product already has a deterministic calculator in `components/bioremediation-form.tsx` and `hooks/use-bioremediation.ts`; chat can easily become a parallel logic path.

**Consequences:** Inconsistent outputs, support confusion, and brittle implementation because dose logic is duplicated across prompt text, retrieval context, and UI.

**Warning signs:**
- Prompt templates contain dosage formulas already encoded in TypeScript.
- QA finds chat answers numerically different from calculator results for the same inputs.
- Designers position chat as "the smart version" of the calculator.
- Engineers discuss patching discrepancies in prompts rather than in shared domain logic.

**Prevention:** Define the authority model explicitly: deterministic calculator computes numeric baseline; chatbot explains, contextualizes, and asks follow-ups; any dose deviation requires a traceable grounded rule and visible justification. Move shared domain rules server-side if the assistant needs to use them. Avoid duplicating calculator math in prompts.

**Detection:** Same user context produces calculator-chat disagreement; support has to tell users which output to trust; code review reveals formulas repeated in prompt builders.

**Which phase should address it:** Phase 2: Secure Retrieval and Backend Integration

## Moderate Pitfalls

### Pitfall 7: Building admin tooling for authoring but not for review, debugging, and incident response
**What goes wrong:** Admins can create cases, but cannot preview retrieval, inspect which cases were cited, reproduce a bad answer, or retire content quickly.

**Prevention:** Admin tooling must include publish workflow, search/filter, preview of retrieval candidates, answer trace view, one-click retire/supersede, and audit history of edits. Add a support/debug surface before broad rollout.

**Warning signs:**
- Admin UI focuses on CRUD only.
- There is no place to see "why did the assistant answer this?"
- Correcting a bad answer requires a developer.

**Which phase should address it:** Phase 3 for trace UX, Phase 4 for incident workflow

### Pitfall 8: Logging too little for safety or too much for privacy
**What goes wrong:** Either the team cannot investigate bad advice because no retrieval trace is stored, or they over-log raw farm context, prompt payloads, and sensitive operational details without clear retention rules.

**Prevention:** Log minimally sufficient artifacts: user, org, timestamp, selected calculator context, cited case IDs, model/provider, answer classification, and whether escalation occurred. Avoid storing unnecessary raw prompt text when structured traces are enough. Set retention and access rules from the start.

**Warning signs:**
- Incident review depends on screenshots from users.
- Raw prompts/responses include more farm detail than support actually needs.
- No one owns retention policy.

**Which phase should address it:** Phase 2 for schema/log design, Phase 4 for operational policy

### Pitfall 9: Assuming provider abstraction means chatbot integration is low risk
**What goes wrong:** Because `lib/ai/provider.ts` already exists, teams assume the new chatbot is mostly a model-selection exercise. They underestimate retrieval orchestration, structured outputs, latency, evals, and fallbacks.

**Prevention:** Plan the chatbot as a product subsystem, not a provider swap. Keep provider selection separate from knowledge retrieval, answer policy, and tracing. Add typed server contracts for request, retrieval result, grounded answer, and refusal states.

**Warning signs:**
- Estimates describe the work as "reuse OCR AI stack."
- No schema is proposed for answer/citation payloads.
- The first implementation plan starts in the UI instead of data and policy.

**Which phase should address it:** Phase 2: Secure Retrieval and Backend Integration

### Pitfall 10: Launching wide before proving behavior on a narrow set of supported questions
**What goes wrong:** The chatbot is positioned as a general bioremediation assistant, so users ask broad diagnostic questions the case library cannot safely answer yet.

**Prevention:** Start with a narrow contract: punctual dosage clarification, known troubleshooting categories, and explicit out-of-scope handling. Encode supported intents and refusal behavior in the system design and UX copy.

**Warning signs:**
- Marketing or in-product copy says "ask anything."
- The knowledge base is small but the product promise is broad.
- The team measures engagement, not safe-resolution rate.

**Which phase should address it:** Phase 3 for UX scoping, Phase 4 for rollout gating

## Minor Pitfalls

### Pitfall 11: Ignoring language normalization in a field-operations domain
**What goes wrong:** Cases and user questions use different naming for the same issue, product shorthand, local expressions, or unit formats, so retrieval misses strong matches.

**Prevention:** Normalize synonyms, units, and common shorthand in the case schema and retrieval pipeline. Support Spanish domain phrasing used by producers and Aquavet staff rather than relying on generic embeddings alone.

**Warning signs:**
- Admins create duplicate tags for the same issue.
- Good cases are not retrieved unless wording matches exactly.

**Which phase should address it:** Phase 1 for taxonomy, Phase 2 for retrieval implementation

### Pitfall 12: Adding the chat UI into an already dense calculator component without decomposition
**What goes wrong:** The feature lands inside the existing bioremediation form as more local state, more side effects, and more conditional rendering. This raises regression risk in a part of the app that already mixes calculation and persistence.

**Prevention:** Split calculator, chat panel, retrieval state, and save/audit actions into separate server-backed boundaries. Keep chat orchestration out of the existing client hook where possible.

**Warning signs:**
- `components/bioremediation-form.tsx` absorbs chat state and API orchestration directly.
- Client hooks start owning auth, retrieval, persistence, and prompt assembly.

**Which phase should address it:** Phase 2: Secure Retrieval and Backend Integration

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Case Library and Governance | Case records are created as freeform anecdotes with no approval state | Define mandatory fields, taxonomy, status workflow, review cadence, and owner per case |
| Phase 1: Case Library and Governance | Stale or contradictory cases remain active | Add versioning, supersession, retirement, and `last_reviewed_at` before chat launch |
| Phase 2: Secure Retrieval and Backend Integration | Retrieval ignores org/product/species filters | Enforce server-side filters before semantic ranking; audit with org-boundary test cases |
| Phase 2: Secure Retrieval and Backend Integration | Chat duplicates calculator math and creates two truths | Keep numeric authority in shared domain logic; chatbot explains or escalates instead of silently recomputing |
| Phase 2: Secure Retrieval and Backend Integration | Browser-side orchestration bypasses policy and traceability | Move chat retrieval, answer assembly, and logging into authenticated server routes/actions |
| Phase 3: Trust UX and In-Product Controls | Users cannot tell evidence-backed advice from model synthesis | Show citations, dates, applicability notes, and unsupported-state messaging |
| Phase 3: Trust UX and In-Product Controls | Product promise is broader than the grounded corpus | Narrow scope copy to supported intents and add escalation CTA to Aquavet |
| Phase 4: Evaluation, Rollout, and Operations | Quality is judged by demos instead of repeatable evals | Build gold-set evals and replay them on prompt, model, and case-library changes |
| Phase 4: Evaluation, Rollout, and Operations | Incident response is slow because traces are missing | Log case IDs, filters, model version, answer class, and escalation outcome with retention rules |

## Sources

- OpenAI, Building guardrails and hallucination-reduction guidance for production LLM apps: https://platform.openai.com/docs/guides/guardrails
- OpenAI, Evals guidance for measuring model/app behavior over fixed datasets: https://platform.openai.com/docs/guides/evals
- OpenAI, retrieval and source-backed application patterns in platform docs: https://platform.openai.com/docs/guides/retrieval
- Anthropic, guardrails and evaluation guidance for production Claude systems: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails
- Anthropic, retrieval and citations patterns in prompt-engineering/docs: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-citations
- Microsoft Learn, Azure AI Search RAG guidance on chunking, metadata, filtering, and relevance: https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview
- Microsoft Learn, guidance on security trimming and access control in AI Search/RAG systems: https://learn.microsoft.com/azure/search/search-security-trimming-for-azure-search
- Google Cloud, grounded generation and cited-answer patterns in Vertex AI/Search docs: https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/overview

## Confidence

- Overall: MEDIUM-HIGH
- High confidence: trust UX, source governance, eval discipline, retrieval scoping, stale-content management
- Medium confidence: exact operational playbook details for aquaculture bioremediation teams, since most primary sources are general grounded-assistant guidance rather than aquaculture-specific case studies
