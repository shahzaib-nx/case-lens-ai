# CaseLens AI Engineering Notes

## Purpose

This document records important engineering decisions, implementation problems, debugging findings, compatibility rules, architectural limitations, and planned technical improvements for CaseLens AI.

It is intended for developers maintaining or extending the project.

This file should not be treated as a user-facing product guide. Current features and installation instructions belong in the main README.

---

## Document Status

Last updated: 2026-07-21

Current application stage:

- Educational prototype
- Local-first browser persistence
- Next.js App Router
- Groq-backed educational generation
- No cloud synchronization
- No user authentication

---

## Engineering Principles

CaseLens AI follows these implementation rules:

1. AI output is never trusted without validation.
2. Scoring and analytics remain deterministic.
3. Completed attempts and sessions should be immutable.
4. Retakes create new sessions instead of overwriting history.
5. Historical data must remain readable.
6. Missing historical fields must not be invented.
7. One attempt should create one stored review.
8. One question review should be reused across all relevant pages.
9. Exam Mode must not reveal feedback before completion.
10. Failed AI operations must not delete learner work.
11. Persistent writes should be idempotent.
12. Planned architecture must not be described as already implemented.

---

## Current Technical Architecture

```text
Browser
├── Next.js pages and React components
├── Zustand application state
├── localStorage persistence
├── Local scoring and analytics
└── Browser print support
        │
        ▼
Next.js API Routes
├── Request validation
├── Prompt construction
├── Groq API calls
├── JSON parsing
├── Zod validation
├── Semantic validation
└── Controlled retry
        │
        ▼
Groq
└── Educational content generation
```

### Current responsibilities

#### Browser

* Collects case input
* Displays generated analysis
* Stores local cases
* Tracks practice sessions
* Stores question attempts
* Calculates scores
* Handles confidence records
* Displays reports

#### Backend

* Protects AI credentials
* Validates requests
* Builds model prompts
* Calls Groq
* Parses generated output
* Rejects malformed responses
* Returns structured data

#### AI provider

* Generates educational analysis
* Generates MCQs
* Generates answer explanations
* Generates distractor explanations
* Generates reasoning content

The AI does not manage:

* Scores
* Timers
* Persistence
* Session status
* User permissions
* Adaptive decision rules

---

## Data Model Overview

The current prototype stores data inside a persisted Zustand state tree.

Important records include:

* Cases
* Case analyses
* Question sets
* Questions
* Practice sessions
* Question attempts
* Confidence ratings
* Results
* Question review data

### Current limitation

The persisted Zustand tree is serialized into browser `localStorage`.

As saved content grows, this may cause:

* Large serialization operations
* Slower hydration
* Deep immutable array updates
* Browser quota errors
* Increased memory use
* Difficult schema migrations

This architecture is acceptable for the current prototype but is not intended as the final storage model.

---

## Important Data Integrity Rules

### Attempt uniqueness

Each submitted question attempt must have a stable unique identifier.

Duplicate submissions caused by:

* Button clicks
* Timer expiry
* React effects
* Route changes
* Page reloads

must not create duplicate attempts.

Reference rule:

```ts
const existingAttempt = session.attempts.find(
  (attempt) => attempt.id === newAttempt.id,
);

if (existingAttempt) {
  return existingAttempt;
}
```

### Session immutability

Once a session is completed:

* Attempts must not be overwritten
* Score must not be recalculated using a new question set
* Mode must not change
* Timer settings must not change
* Retakes must create a new session

### Question-set versioning

A completed session must reference the exact question set used during that session.

Recommended fields:

```ts
questionSetId: string;
questionSetVersion: number;
questionIds: string[];
```

Old results must not accidentally resolve against newly generated questions.

---

## Question Review Architecture

Question reviews use three information layers.

### Immutable question content

Contains:

* Stem
* Options
* Correct answer
* Correct-answer explanation
* Distractor explanations
* Decisive clue
* Reasoning framework
* Tested concepts
* Difficulty
* High-yield takeaway

### Immutable learner attempt

Contains:

* Selected option
* Confidence
* Correctness
* Hint use
* Time spent
* Submission reason
* Submission timestamp

### Review snapshot

Contains attempt-specific conclusions that must remain historically stable:

* Confidence insight
* Probable error type
* Concept impact
* Adaptive recommendation reference
* Review-rule version

The rendered review is:

```text
Question
+
Attempt
+
Review snapshot
=
Question Review Card
```

### Review consistency rule

A question review is constructed once and reused.

#### Learning Mode

```text
Submit answer
→ Save attempt
→ Construct review snapshot
→ Show review immediately
→ Reuse the same review in final results
```

#### Exam Mode

```text
Submit answer
→ Save attempt
→ Construct review snapshot
→ Keep review hidden
→ Reveal the same review after test completion
```

The final Results page must not regenerate a different explanation.

---

## Resolved Engineering Issues

## 1. Legacy Question ID Mapping

### Problem

Older generated questions did not always contain stable question IDs.

Attempts were sometimes linked using a generated fallback such as:

```text
q-0
q-1
q-2
```

Results could fail when the question identifier used during practice differed from the identifier reconstructed during review.

### Root cause

* Missing IDs in historical question payloads
* Question index used inconsistently
* Legacy and newer question models used different identifier rules

### Resolution

A backward-compatible question ID resolver was introduced.

Reference behaviour:

```ts
function resolveQuestionId(
  question: McqQuestion,
  index: number,
): string {
  return question.id ?? `q-${index}`;
}
```

The same resolver must be used consistently during:

* Question rendering
* Attempt creation
* Results mapping
* Report generation
* Historical hydration

### Compatibility rule

Historical questions should not be rewritten merely to add generated IDs.

---

## 2. Ghost Session Results Bug

### Problem

After completing practice and navigating to Results, the interface sometimes displayed:

```text
0 answered
```

even though completed attempts existed in persisted local state.

### Root cause

The Results page selected the “latest” session using timestamp sorting.

During Practice page unmounting or rerendering, an empty session could be created. Because that session had the newest timestamp, Results selected it instead of the completed session.

### Resolution

The completed session ID is passed explicitly during navigation:

```text
/case/results?id=<caseId>&sessionId=<sessionId>
```

The Results page resolves the exact requested session rather than guessing based on dates.

### Engineering lesson

Do not use “latest record” heuristics when the application already knows the exact record being requested.

---

## 3. TypeScript Strict Compilation Failures

### Problem

Some UI updates appeared not to work because the application contained hidden TypeScript errors.

Examples included:

* Duplicate helper functions
* Missing React imports
* Invalid union property access
* `McqQuestion | LegacyQuestion` incompatibilities
* Undefined optional properties
* Mismatched session fields

### Resolution

The codebase was checked using:

```bash
npx tsc --noEmit
```

Errors were corrected before relying on browser behaviour.

### Engineering lesson

A browser refresh is not a type checker, despite the industry’s continuing optimism.

---

## 4. Exam Feedback Leakage Risk

### Problem

Correct answers and explanations could remain mounted in the page and merely be hidden using CSS.

This could expose feedback through:

* Browser inspection
* Screen readers
* Hidden DOM nodes
* Accidental component state
* Future style regressions

### Resolution

Exam feedback must not be rendered before session completion.

Reference condition:

```ts
const canRevealFeedback =
  session.mode === "learning" ||
  session.status === "completed" ||
  session.status === "expired";
```

### Rule

Do not rely on:

```css
display: none;
```

for active Exam Mode protection.

---

## 5. Timer Reset and Drift

### Problem

A timer represented only as a decreasing number could reset after:

* Page refresh
* Browser backgrounding
* Component remounting
* Navigation changes

### Resolution

Timers use absolute timestamps:

```ts
startedAt: string;
expiresAt: string;
```

Remaining time is calculated from:

```ts
expiresAt - Date.now()
```

### Timeout behaviour

For total timer expiry:

* Selected answer is saved
* Missing confidence is allowed because submission was forced
* No selected answer becomes unanswered
* Remaining questions become unanswered
* Session completes
* Results page opens

---

## 6. Duplicate Review Creation

### Problem

The same attempt could create multiple question-review records because review generation could run during:

* Submission
* Results rendering
* Hydration
* Timer handling
* React effect reruns

### Resolution

Review creation is idempotent.

```ts
const existingReview = session.questionAnalyses.find(
  (review) => review.attemptId === attempt.id,
);

if (existingReview) {
  return existingReview;
}
```

### Rule

Use `attemptId` as the review identity, not only `questionId`.

Retakes can create multiple attempts for the same question.

---

## 7. Adaptive Evidence Duplication

### Problem

Adaptive evidence could be recorded more than once from the same attempt.

### Resolution

Adaptive evidence should preferably be derived from immutable attempts.

```ts
function deriveAdaptiveEvidence(
  attempts: QuestionAttempt[],
): AdaptiveEvidence[] {
  return attempts
    .filter(isEligibleAttempt)
    .map(toAdaptiveEvidence);
}
```

If evidence is persisted separately, it must be unique by `attemptId`.

### Rule

Rendering a Results page must never create new adaptive evidence.

---

## 8. Unstable Concept Names

### Problem

Different display labels could refer to the same medical concept:

```text
MCA stroke
MCA localisation
Middle cerebral artery territory
```

Using display text as the identifier could create multiple adaptive profiles.

### Resolution

Use canonical concept IDs:

```text
neurology.stroke.mca-localisation
```

Store readable labels separately.

### Historical behaviour

Questions without a reliable concept ID:

* Remain readable
* Are excluded from adaptive calculation
* Must not receive an invented identifier during hydration

---

## 9. Large AI Payloads

### Problem

Sending full cases, every question, every explanation, and complete practice history to the model creates:

* Higher token costs
* Slower responses
* Larger failure surfaces
* Unnecessary learner-data transmission

### Resolution

Send compact, purpose-specific payloads.

Example performance summary:

```json
{
  "conceptId": "neurology.stroke.mca-localisation",
  "attempts": 5,
  "correct": 3,
  "incorrect": 2,
  "highConfidenceErrors": 1
}
```

### Rule

Do not send complete history when deterministic local aggregation is sufficient.

---

## 10. AI JSON Reliability

### Problem

A model returning JSON does not guarantee that the result is valid application data.

Possible failures:

* Invalid JSON
* Missing required fields
* Multiple correct options
* Incorrect option counts
* Empty explanations
* Wrong difficulty
* Wrong concept
* Duplicated questions
* Invented case findings

### Resolution

AI output follows this pipeline:

```text
Raw response
↓
JSON parse
↓
Zod validation
↓
Semantic validation
↓
Controlled retry
↓
Accepted result or recoverable error
```

### Retry policy

* Retry only for recoverable formatting or schema failures
* Limit retries
* Do not loop indefinitely
* Preserve successful work from unrelated operations

---

## 11. Coupled AI Generation Failures

### Problem

Combining case analysis and progressive-stage generation into one very large model call made unrelated features fail together.

### Resolution

Use separate server-side operations:

```text
Operation 1:
Generate and validate case analysis

Operation 2:
Generate and validate progressive stages
```

A progressive-stage failure must not delete a successful case analysis.

---

## 12. Monolithic localStorage Limitation

### Problem

All persistent application data currently exists inside one Zustand-persisted JSON structure.

Every nested update may require rebuilding and serializing a large state object.

### Approved future direction

* Repository interfaces
* IndexedDB through Dexie
* Normalized object stores
* Record-level asynchronous writes
* Migration from legacy local storage
* Future cloud synchronization

### Important status

This is a planned migration unless the repository confirms it has already been implemented.

---

## Current Backward-Compatibility Rules

Historical data may lack newly introduced fields.

Use these fallbacks:

| Missing field                | Fallback                           |
| ---------------------------- | ---------------------------------- |
| Practice mode                | Learning Mode                      |
| Case format                  | Complete Case                      |
| Confidence                   | Not recorded                       |
| Adaptive setting             | Disabled                           |
| Differential Builder setting | Disabled                           |
| Analysis reveal status       | Revealed                           |
| Progressive data             | Complete Case workflow             |
| Concept ID                   | Exclude from adaptive calculations |
| Difficulty                   | Difficulty not recorded            |
| Hint metadata                | Unknown                            |
| Review snapshot              | Use safe legacy rendering          |

Historical data should not be rewritten automatically during hydration.

---

## Current Known Limitations

* Browser-local persistence only
* No account system
* No cloud backup
* No cross-device synchronization
* Limited browser-storage capacity
* No licensed textbook ingestion
* No source-grounded retrieval yet
* No medical image interpretation
* No secure examination controls
* No proctoring
* No patient-data workflow
* AI output still requires verification
* Automated testing may be incomplete
* Older records may have reduced metadata

---

## Open Engineering Work

### Priority 1: Stabilization

* Verify all current routes
* Confirm current question schema
* Confirm current session schema
* Add automated tests
* Verify Learning Mode
* Verify Exam Mode
* Verify structured question review
* Verify historical record hydration
* Create stable GitHub checkpoint

### Priority 2: Data architecture

* Add repository interfaces
* Introduce Dexie
* Normalize local persistence
* Add migration checks
* Preserve rollback path
* Add IndexedDB transaction tests

### Priority 3: Source-grounded medical content

* Add resource catalogue
* Add edition tracking
* Add page and figure records
* Add citation links
* Add licensing metadata
* Add extraction review
* Add hybrid retrieval
* Add medical-content validation

### Priority 4: Cloud architecture

* Authentication
* Cloud database
* Object storage
* Multi-device sync
* Offline outbox
* Conflict handling
* Security policies
* Audit records

---

## Planned IndexedDB Migration

### Proposed object stores

```text
cases
case_contents
question_sets
questions
practice_sessions
question_attempts
question_review_snapshots
differential_drafts
differential_submissions
progressive_sessions
progressive_responses
adaptive_decisions
revision_items
sync_outbox
sync_metadata
application_settings
```

### Migration sequence

1. Add repository interfaces.
2. Introduce Dexie without changing page behaviour.
3. Read legacy Zustand-persisted data.
4. Normalize records.
5. Write records to IndexedDB.
6. Compare entity counts.
7. Verify identifiers and relationships.
8. Prefer IndexedDB reads.
9. Retain legacy fallback temporarily.
10. Stop old writes after verification.
11. Remove legacy persistence only after a safe checkpoint.

### Migration safety rule

Never delete the old persisted state until the new data has been verified.

---

## Performance Verification

Future scale testing should include:

* 1,000 cases
* 10,000 sessions
* 100,000 attempts
* Large analysis content
* Long option explanations
* Multiple question-set versions

Measure:

* Application startup
* State hydration
* Attempt submission latency
* Results-page loading
* Indexed query performance
* Memory use
* Serialization cost
* Browser responsiveness

---

## Testing Strategy

### Unit tests

Cover:

* Scoring
* Confidence interpretation
* Timer calculations
* Adaptive decisions
* Concept classifications
* Legacy field fallbacks
* Question ID resolution
* Duplicate prevention

### Integration tests

Cover:

* Case creation
* AI response validation
* Practice submission
* Session completion
* Results rendering
* Retakes
* Historical hydration
* Question-review consistency

### End-to-end tests

Cover:

* Complete Learning Mode flow
* Complete Exam Mode flow
* Timer expiry
* Refresh during practice
* Back navigation
* Missing case
* AI failure
* Print and report flow

### Verification commands

Use commands that exist in `package.json`.

Typical commands may include:

```bash
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

Do not record a check as passing unless it was run against the exact commit.

---

## Decision Log

Record important technical decisions in this format.

### Decision: Use one practice engine

**Status:** Accepted

**Context:**
Learning Mode and Exam Mode have different feedback timing but use the same questions, attempts, sessions, scoring and reports.

**Decision:**
Use one practice engine with mode-specific interaction rules.

**Reason:**
Two quiz engines would duplicate logic and allow scoring or persistence behaviour to drift.

**Consequences:**

* Shared session model
* Shared attempt model
* Shared Results page
* Conditional feedback rendering
* Lower maintenance burden

---

### Decision: Store compact review snapshots

**Status:** Accepted

**Context:**
Question review content must remain identical between immediate Learning Mode feedback and final Results.

**Decision:**
Store immutable question content separately from learner attempts and compact review snapshots.

**Reason:**
This prevents data duplication while preserving historical consistency.

**Consequences:**

* Old reviews remain stable
* Question content is not copied into every attempt
* Review-rule versions can evolve safely

---

### Decision: Adapt between batches

**Status:** Accepted

**Context:**
Generating a new AI question after every answer increases latency, cost and instability.

**Decision:**
Adaptive difficulty changes between small question batches.

**Consequences:**

* Active Exam Mode remains fixed
* Learning Mode can generate focused review batches
* Fewer AI calls
* Easier result comparison

---

### Decision: Deterministic Adaptive Engine and Master Dashboard

**Status:** Accepted

**Context:**
The AI cannot reliably read unstructured historical arrays to classify weakness or adapt difficulty, and frontend components should not house dense mathematical aggregation.

**Decision:**
Extract all aggregation, chronologically grouped performance sorting, and 7-tier confidence/accuracy classification rules into pure TypeScript functional utilities (`lib/results`). The adaptive engine and the Master Weak Concepts dashboard consume these purely deterministic outputs rather than querying the AI. 

**Reason:**
A 100% deterministic local pipeline ensures testability (covered by 28 specific edge-case unit tests) and guarantees the dashboard data precisely matches user expectations without hallucinated scores. The AI's role is relegated strictly to reading the deterministic summary string and providing qualitative feedback.

**Consequences:**
* AI prompts are simpler and cheaper (receive pre-calculated summaries).
* Adaptive decisions fire reliably off explicit rules.
* Heavy logic is removed from React components.
* 28 new jest test cases strictly enforce behaviour.

---

## Incident Record Template

Use this template for future significant defects:

```markdown
## Incident: Short descriptive title

**Date:** YYYY-MM-DD  
**Status:** Resolved / Monitoring / Open  
**Severity:** Low / Medium / High  
**Affected area:** Practice / Results / Storage / AI / Reports

### Symptoms

Describe what the learner or developer observed.

### Expected behaviour

Describe what should have happened.

### Root cause

Explain the technical cause.

### Resolution

Explain what changed.

### Verification

List commands, tests, or manual checks performed.

### Regression protection

List tests or safeguards added.

### Remaining risk

Explain anything not fully resolved.
```

---

## Change Discipline

When updating this document:

* Describe verified behaviour accurately.
* Distinguish completed work from planned work.
* Include affected files when known.
* Record the root cause, not only the symptom.
* Record verification steps.
* Avoid copying temporary debugging speculation as fact.
* Do not include secrets, API keys, access tokens, or private case content.
* Keep user-facing instructions in `README.md`.
* Keep large architecture proposals in dedicated architecture documents.

---

## What belongs here versus elsewhere

| Content | Location |
|---|---|
| Product description | `README.md` |
| Installation instructions | `README.md` |
| Current features | `README.md` |
| Bug causes and fixes | `docs/engineering-notes.md` |
| Technical decisions | `docs/engineering-notes.md` |
| Detailed future data architecture | `docs/architecture/data-architecture.md` |
| Medical resource ingestion design | `docs/architecture/medical-knowledge.md` |
| API documentation | `docs/api.md` |
| User privacy explanation | `PRIVACY.md` or `/privacy` |
| Release history | `CHANGELOG.md` |

The engineering notes should remain a **living technical record**, not a second README wearing safety goggles.
