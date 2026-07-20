# Changelog

All notable changes to CaseLens AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Planned
- **Phase-2 IndexedDB Migration:** Shift away from monolithic `localStorage` Zustand persistence to `Dexie.js` for `O(1)` relational object stores.
- **Advanced Learning Features:** Progressive Case Reveal, Pre-Answer Confidence Ratings, and Differential Diagnosis Builder.
- **Phase-3 Cloud Sync:** Implement a local-first synchronization architecture for cross-device support.

---

## [1.2.0] - 2026-07-21
### Added
- **Deterministic Adaptive Engine:** Fully functional local adaptive difficulty engine powered by deterministic 7-tier classification utilities, utilizing historical error rates and confidence patterns to generate focused review sessions.
- **Master Weak Concepts Dashboard:** Overhauled Overall Results page containing a comprehensive dashboard across all cases and sessions, combining `Answered Accuracy` and `Overall Score` with precise chronological concept mapping and adaptive review launchers.
- **Comprehensive Test Suite:** 28 new Jest test cases strictly enforcing the correct behaviour of the deterministic aggregation pipeline.

---

## [1.1.0] - 2026-07-21
### Added
- **Comprehensive Architectural Documentation:** Created a massive, strict set of technical guidelines outlining the engineering principles, data models, privacy controls, and future ingestion pipelines.
  - `docs/engineering-notes.md`: Living technical record of engineering decisions, defect resolutions, and compatibility rules.
  - `docs/architecture/data-architecture.md`: Blueprint for the current state and the Phase-2 IndexedDB Normalization Plan.
  - `docs/api.md`: Strict specifications mapping the Next.js API boundaries, Prompt Strategies, and AI Schema Validations.
  - `docs/architecture/medical-knowledge.md`: Future workflow design for Canonical Medical Resource Ingestion and Source-Grounded RAG.
  - `docs/privacy-and-security.md`: Defined security boundaries, PII-avoidance rules, and local-first data protection strategies.
- **Table of Contents & Vercel Links:** Overhauled the main `README.md` to cleanly separate reality from ambition, providing an accurate representation of the currently working prototype and the live Vercel deployment.

### Fixed
- **Vercel Build Crashes:** Refactored the OpenAI/Groq client instantiation in `lib/ai.ts` to lazy-load inside request handlers, preventing static build-time environment variable failures.
- **Ghost Session Results Bug:** Fixed race condition where empty sessions were incorrectly fetched by using explicit URL-parameter session identification (`?id=<caseId>&sessionId=<sessionId>`) rather than timestamp heuristics.
- **Legacy Question ID Mapping:** Resolved issues where old questions lacked stable IDs by introducing a backward-compatible resolver (`q-${index}`).
- **TypeScript Strict Compilation:** Enforced `npx tsc --noEmit` and resolved hidden type-safety bugs, invalid union accesses, and missing imports.
- **Exam Feedback Leakage Risk:** Prevented Exam Mode feedback from leaking via CSS by ensuring explanations are not mounted into the DOM until the session is completed or expired.
- **Timer Drift:** Replaced relative countdowns with absolute timestamps (`startedAt`, `expiresAt`) to survive page reloads.

---

## [1.0.0] - Initial Prototype Release
### Added
- **Educational Content Generation:** Next.js API routes interacting with Groq (`llama-3.3-70b-versatile`) to generate detailed clinical analysis and multiple-choice questions from raw text.
- **Practice Engine:** Support for Learning Mode (immediate feedback) and Exam Mode (deferred feedback).
- **Zustand Persistence:** Monolithic browser `localStorage` architecture to save cases, sessions, attempts, and generated reports offline.
- **Local Scoring & Analytics:** Deterministic client-side logic for score calculation, confidence tracking, and basic performance summaries.
- **Educational UI:** Minimalist, clean user interface built with React, Next.js App Router, and Tailwind CSS.
