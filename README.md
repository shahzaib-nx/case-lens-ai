# CaseLens AI

🚀 **[Live Deployment: CaseLens AI on Vercel](https://case-lens-ai.vercel.app/)**

**AI-assisted clinical case reasoning and MCQ learning platform**

CaseLens AI is an educational medical learning application that helps learners analyse clinical cases, build differential diagnoses, practise case-based MCQs, review reasoning errors, and identify concepts that require further study.

The platform combines structured artificial intelligence with deterministic local analytics. AI generates educational content, while scoring, confidence interpretation, timers, session tracking, and adaptive-learning decisions are handled through controlled application logic.

> **Educational use only**
>
> CaseLens AI is not a medical device, diagnostic tool, prescribing system, or substitute for qualified clinical judgment. It must not be used for real-patient diagnosis, treatment, emergency decisions, or medication dosing.

---

## Project Status

CaseLens AI is currently an evolving educational prototype.

The project already contains the foundational case-analysis and MCQ workflow. Several advanced learning features have been fully designed and are being integrated in controlled phases.

### Status legend

- ✅ Available in the current prototype
- 🟡 Under implementation or requiring final repository verification
- 🧭 Approved future architecture
- ❌ Outside the current scope

---

## Current Core Workflow

The current application is designed around the following learning pathway:

```text
Enter a fictional or de-identified clinical case
↓
Generate an educational case analysis
↓
Review the reasoning and important findings
↓
Generate case-specific MCQs
↓
Complete MCQ practice
↓
Review answers and explanations
↓
Inspect overall results and learning priorities
↓
Save or print educational reports
```

## Current Features

### Case creation
- ✅ Enter a fictional or de-identified clinical case
- ✅ Case-length validation
- ✅ Difficulty selection
- ✅ Exam-style selection
- ✅ Question-count selection
- ✅ Local case persistence
- ✅ Case history
- ✅ Individual case deletion
- ✅ Clear-all history action
- ✅ State-preserving navigation
- ✅ Reset-form confirmation

### Supported difficulty levels
Basic, Intermediate, Advanced

### Supported exam styles
General, NRE, USMLE, PLAB, MRCP

### Supported MCQ counts
3 questions, 5 questions, 10 questions

### Case analysis
The case-analysis workflow is designed to generate structured educational content such as:
- Problem representation
- Key positive findings
- Relevant negative findings
- Most likely educational interpretation
- Differential considerations
- Reasoning pathway
- Missing information
- Learning focus
- High-yield summary
- Educational safety notice

*If the submitted case lacks enough information, the application may return a More Information Needed state rather than inventing unsupported medical facts.*

### MCQ generation
Generated MCQs are designed to include:
- Four or five answer options
- Exactly one correct answer
- Explanation of the correct answer
- Explanation of every incorrect option
- Tested medical concept
- Difficulty metadata
- High-yield takeaway
- Case-specific educational context

### Practice workflow
- ✅ One-question-at-a-time practice
- ✅ Answer selection
- ✅ Submission and answer locking
- ✅ Progress tracking
- ✅ Individual question feedback
- ✅ Final score
- ✅ Question-by-question review
- ✅ Retake support
- ✅ Local attempt persistence

### Reports
The application includes or is designed to include:
- Educational Case Analysis
- MCQ Review
- Full Learning Report
- Overall Results Summary
- Browser print support
- Save as PDF through the browser print dialog

---

## Advanced Learning Features

The following features have complete implementation specifications and are being integrated into the existing workflow.

### 1. Pre-Answer Confidence Rating (🟡)
Before submitting an MCQ answer, the learner records confidence as: Low, Moderate, High.
Confidence is used to distinguish between reliable understanding, correct answers with uncertainty, possible misconceptions, incorrect answers with low confidence, and high-confidence errors. Confidence does not alter the raw score.

### 2. Differential Diagnosis Builder (🟡)
Before the complete educational analysis is revealed, the learner may be asked to record their interpretations and findings. The learner’s reasoning can then be compared with the generated educational analysis to identify areas of alignment, missing alternatives, and unsupported assumptions.

### 3. Progressive Case Reveal (🟡)
Progressive Case Reveal allows learners to work through a case in stages (Presentation, History, Examination, Investigations). After all stages, the application presents a Reasoning Timeline showing how the learner’s interpretation evolved.

### 4. Learning Mode and Exam Mode (🟡)
- **Learning Mode**: Correctness, full explanations, error analysis, and high-yield takeaways are shown immediately after answering.
- **Exam Mode**: Correctness and explanations remain hidden. Answers are locked. Results and analyses are only revealed at the end of the test.

### 5. Adaptive Question Difficulty (🟡)
Adaptive Difficulty adjusts future focused-practice batches according to deterministic application rules (not AI). The application calculates the recommendation locally using correctness, confidence, repeated errors, and hints.

### Structured Question-by-Question Review (🟡)
Each submitted MCQ produces one canonical review object. CaseLens AI strictly follows the **Question Review Consistency Rule**: A question analysis is generated or constructed once, stored once, and reused everywhere. The application must not regenerate a different explanation when the learner opens the final Results page.

---

## Technology Stack

**Codebase Distribution (Approximate):**
- **TypeScript / React (Frontend & Backend Routes)**: ~85%
- **CSS / Tailwind (Styling & Design)**: ~10%
- **JSON / Configs (Tooling & Dependencies)**: ~5%

### Frontend
- Next.js (App Router)
- React & TypeScript
- Responsive web design with CSS Modules & Tailwind CSS
- Browser print support

### State management
- Zustand (Typed application state)
- Browser-local persistence (`localStorage`)
- Deterministic helper utilities

### Validation
- Zod (Client/Server request validation)
- Semantic validation for generated content

### AI provider
- Groq (Centrally configured Groq model, currently utilizing `llama-3.3-70b-versatile`)
- Configured exclusively via secure environment variables on the backend.

---

## Backend Responsibilities & AI Usage

CaseLens AI uses Next.js server routes as the trusted boundary between the browser and external AI services. The browser **never** calls the AI provider directly.

**Backend Responsibilities:**
Validating incoming requests, protecting API keys, building controlled AI prompts, calling Groq, parsing model responses, validating JSON with Zod, applying controlled retry policies, and preventing oversized AI payloads.

**AI Responsibilities:**
Generating clinical case analysis, MCQ generation, correct/distractor explanations, decisive clue generation, reasoning frameworks, differential comparison, and focused study material.

**AI Constraints (What AI does NOT do):**
AI is not used as the source of truth for raw scoring, confidence totals, timer calculations, session state, adaptive-difficulty decisions, permission enforcement, or local analytics. All quantitative and persistent logic is handled deterministically via local application logic.

**AI Safety and Validation Pipeline:**
`AI response` → `JSON parsing` → `Zod validation` → `Semantic validation` → `Controlled retry` → `Accepted application data`

---

## Data Management

### Current Prototype Architecture
The current prototype utilizes **Zustand** for global application state, persisted entirely into browser `localStorage`. This includes local case history, local question attempts, and results, with no cross-device cloud synchronization.

### Approved Future Data Architecture (🧭)
The current monolithic `localStorage` paradigm risks browser quota exhaustion (5MB limit), deep array mutation bottlenecks, and memory strain. 
The future approved architecture plans to aggressively separate:
- **Zustand**: Temporary interface state (loading spinners, navigation).
- **IndexedDB**: Offline cache, downloaded questions, and local attempt storage.
- **CaseLens Cloud DB**: Cases, sessions, attempts, review snapshots, and analytics as the ultimate system of record.

---

## Errors Faced & Architectural Fixes Implemented

During the development and scaling of the prototype, the engineering team overcame several critical architectural and logic hurdles:

1. **Legacy ID Mapping Failures (The "q-idx" bug)**
   - *Issue*: Older MCQs lacked explicit UUIDs, causing the Results page to fail to map user attempts to questions correctly.
   - *Solution*: Upgraded the backend and the Zustand store to implement a backward-compatible fallback ID generator (`q-${idx}`), ensuring backward compatibility across all legacy generated cases.
2. **The "Ghost Session" Analytics Bug**
   - *Issue*: When navigating rapidly from the Practice Page to the Results Page, the React component lifecycle unmounted and inadvertently triggered the auto-generation of an empty "Ghost Session". The Results page's heuristic date-sorting (`getLatestSession`) was being tricked into rendering the empty session instead of the one the user just completed, resulting in a "0 answered" UI bug despite the database properly saving the attempts.
   - *Solution*: Deprecated purely date-based heuristic lookups. Upgraded the Next.js router to explicitly pass the exact `sessionId` query parameter directly in the URL (`/case/results?id=...&sessionId=...`). The Results page now deterministically reads the exact session provided.
3. **TypeScript Strict Compilation Crashes**
   - *Issue*: Duplicate helper functions and union-type mismatches (`McqQuestion | LegacyQuestion`) were causing Next.js Turbopack to silently fail to compile, hiding updates from the UI.
   - *Solution*: Ran a "Deepest Audit" using `npx tsc --noEmit` across the entire codebase to expose and eradicate hidden strict-typing errors, missing React imports (`useMemo`), and undefined object properties. 
4. **Monolithic Storage Bottlenecks**
   - *Issue*: Discovering that mapping `O(N)` over deeply nested arrays within the 5MB `localStorage` Zustand tree causes significant UI jank and threatens imminent quota exhaustion.
   - *Solution*: Developed and approved the Phase-2 IndexedDB Normalization Plan to flatten relational arrays into O(1) Object Stores.
