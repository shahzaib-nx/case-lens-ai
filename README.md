# CaseLens AI

🚀 **[Live Deployment: CaseLens AI on Vercel](https://case-lens-ai.vercel.app/)**

**AI-assisted clinical case reasoning and MCQ learning platform**

CaseLens AI is an educational medical learning application that helps learners analyse clinical cases, build differential diagnoses, practise case-based MCQs, review reasoning errors, and identify concepts that require further study.

The platform combines structured artificial intelligence with deterministic local analytics. AI generates educational content, while scoring, confidence interpretation, timers, session tracking, and adaptive-learning decisions are handled through controlled application logic.

> **Educational use only**
>
> CaseLens AI is not a medical device, diagnostic tool, prescribing system, or substitute for qualified clinical judgment. It must not be used for real-patient diagnosis, treatment, emergency decisions, or medication dosing.

---

## Table of Contents

- [Overview](#overview)
- [Live Application](#live-application)
- [Current Status](#current-status)
- [Core Workflow](#core-workflow)
- [Feature Status](#feature-status)
- [Technology Stack](#technology-stack)
- [Current Architecture](#current-architecture)
- [Backend and AI](#backend-and-ai)
- [Data Management](#data-management)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Application Routes](#application-routes)
- [Screenshots](#screenshots)
- [Testing and Verification](#testing-and-verification)
- [Known Limitations](#known-limitations)
- [Security and Privacy](#security-and-privacy)
- [License](#license)
- [Project Context](#project-context)
- [Key Engineering Decisions](#key-engineering-decisions)

---

## Current Status

CaseLens AI is currently an evolving educational prototype. 

The project already contains the foundational case-analysis and MCQ workflow. Several advanced learning features have been fully designed and are being integrated in controlled phases.

## Core Workflow

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

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Clinical case submission | Available | Fictional or de-identified cases |
| AI case analysis | Available | Server-side Groq integration |
| MCQ generation | Available | Case-specific questions |
| One-question-at-a-time practice | Available | Local persistence |
| Question-by-question results | Available | Stored question explanations |
| Printable reports | Available | PDF output via browser |
| Confidence rating | Available | Low, Moderate, High |
| Differential Diagnosis Builder | Available | Pre-analysis reasoning |
| Progressive Case Reveal | Available | Staged case reasoning |
| Learning Mode | Available | Immediate feedback |
| Exam Mode | Available | Delayed feedback |
| Adaptive Difficulty | Available | Deterministic local engine |
| Master Weak Concepts Dashboard | Available | Cross-session aggregation |
| Floating Notifications & Popups | Available | Unified `ToastProvider` & `ConfirmProvider` |
| AI Resilience Engine | Available | Automatic error-recovery and retries |
| IndexedDB migration | Planned | Replaces monolithic persistence |
| Cloud synchronization | Future | Not currently available |
| Medical source ingestion | Future | Requires licensing and review |

## Technology Stack

- TypeScript
- React
- Next.js App Router
- CSS Modules
- Zustand
- Zod
- Groq
- Vercel

## Current Architecture

```text
Browser
├── Next.js client pages
├── React components
├── Zustand state
└── localStorage persistence
        │
        ▼
Next.js API Routes
├── Request validation
├── Prompt construction
├── Groq API communication
├── JSON parsing
├── Zod validation
└── Structured response
        │
        ▼
Groq
└── Educational content generation
```

### Responsibility Boundaries

**Browser**
* Displays the interface
* Stores local cases and attempts
* Calculates scores
* Tracks confidence
* Handles navigation and reports

**Next.js backend**
* Protects API keys
* Validates requests
* Calls Groq
* Validates model responses
* Returns safe structured data

**Groq**
* Generates educational analysis
* Generates MCQs and explanations
* Does not calculate scores
* Does not manage storage
* Does not decide user permissions

## Backend and AI

CaseLens AI uses Next.js server routes as the trusted boundary between the browser and external AI services. The browser **never** calls the AI provider directly.

**AI Constraints (What AI does NOT do):**
AI is not used as the source of truth for raw scoring, confidence totals, timer calculations, session state, adaptive-difficulty decisions, permission enforcement, or local analytics. All quantitative and persistent logic is handled deterministically via local application logic.

**AI Safety and Validation Pipeline:**
`AI response` → `JSON parsing` → `Zod validation` → `Semantic validation` → `Controlled retry` → `Accepted application data`

## Data Management

Browser `localStorage` has a relatively small implementation-dependent quota and requires synchronous serialization of the persisted state. As saved analyses, MCQs, explanations, and sessions grow, this architecture may encounter quota and performance limitations.

A planned future migration to IndexedDB will allow asynchronous, indexed, record-level reads and writes instead of serializing the complete application state after every update.

## Installation

### Prerequisites

- Node.js 20 or later
- npm
- A Groq API key

### Local Setup

```bash
git clone https://github.com/adsahib01-wq/case-lens-ai.git
cd case-lens-ai
npm install
```

Create `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run build:mobile` | Create a mobile build with Capacitor |
| `npm run start` | Run the production build |
| `npm run lint` | Run lint checks |
| `npm run test` | Run automated tests |

## Project Structure

```text
app/
├── api/                  Server-side API routes
├── case/                 Case analysis and practice pages
├── history/              Saved case history
├── new-case/             New case form
├── privacy/              Privacy page
└── report/               Printable reports

components/
├── Shared UI components
├── Question components
├── Analysis components
└── Dialogs and recovery states

lib/
├── ai.ts                 AI integration and schemas
├── store.ts              Zustand state and persistence
├── validation utilities
└── analytics utilities

public/
└── Static assets
```

## API Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | Generate educational case analysis |
| `POST` | `/api/generate-example-case` | Generate a quick example case |
| `POST` | `/api/generate-mcqs` | Generate case-specific MCQs |
| `POST` | `/api/analyze-performance` | Perform learning analytics |
| `POST` | `/api/generate-overall-analysis` | Generate aggregate performance review |
| `POST` | `/api/generate-study-material` | Generate focused study items |
| `POST` | `/api/compare-differential` | Compare learner reasoning (Status: planned) |

## Application Routes

| Route | Purpose |
|---|---|
| `/` | Home |
| `/new-case` | Create a case |
| `/case` | Case analysis |
| `/case/practice` | MCQ practice |
| `/case/results` | Individual case results |
| `/history` | Saved case history |
| `/results` | Overall results across all cases |
| `/about` | About CaseLens AI |
| `/privacy` | Privacy Policy |
| `/safety` | Safety Guidelines |
| `/report/analysis` | Printable analysis report |
| `/report/full` | Printable full report |
| `/report/mcqs` | Printable MCQ review report |
| `/report/results-summary` | Printable aggregate summary report |

## Screenshots

### Home
![CaseLens AI home page](docs/screenshots/home.png)

### Case Analysis
![Educational case analysis](docs/screenshots/case-analysis.png)

### MCQ Practice
![MCQ practice screen](docs/screenshots/mcq-practice.png)

### Results
![Question-by-question results](docs/screenshots/results.png)

## Testing and Verification

The project currently uses:

- TypeScript compilation
- Next.js production build validation
- Manual end-to-end workflow testing
- AI-response schema validation
- Backward-compatibility checks for legacy records

### Latest verified commands

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Automated unit and integration test coverage is still being expanded via Jest.

## Known Limitations

- Data is currently stored in the active browser profile.
- Clearing browser data removes saved cases and results.
- There is no account or cloud synchronization.
- The application is not intended for patient care.
- AI responses may contain errors or omissions.
- Medical claims must be verified against trusted sources.
- Advanced learning features may still be under implementation.
- Browser print output can vary between browsers.
- Timed Exam Mode is not secure or tamper-proof.

## Security and Privacy

- API keys remain server-side.
- Users should submit only fictional or de-identified cases.
- The application does not currently provide cloud backup.
- Relevant case text is transmitted to the configured AI provider when generation is requested.
- Saved local data may be accessible to anyone using the same browser profile.
- No protected health information should be entered.

## License

Copyright © 2026 Shahzaib.

No licence has been granted for redistribution or commercial use unless a separate `LICENSE` file states otherwise.

## Project Context

CaseLens AI was developed as an AI-enabled educational application for the ACT AI Final Course Project.

### Author

Shahzaib

## Architecture and Documentation

For detailed architectural guidelines, API specifications, and historical engineering decisions, refer to the following documents:

- **[Engineering Notes](docs/engineering-notes.md)**: A living technical record tracking engineering decisions, defects, compatibility rules, and resolution findings.
- **[Data Architecture](docs/architecture/data-architecture.md)**: The definitive blueprint for data ownership, schema definitions, and the planned IndexedDB migration strategy.
- **[API Specifications](docs/api.md)**: Strict endpoint specifications outlining prompt strategies, AI schema validation, and Next.js boundary protections.
- **[Medical Knowledge Architecture](docs/architecture/medical-knowledge.md)**: Future workflow design for Canonical Medical Resource Ingestion and Source-Grounded Retrieval-Augmented Generation (RAG).
- **[Privacy and Security](docs/privacy-and-security.md)**: Defines the platform's security boundaries, PII-avoidance rules, and local-first data protection strategies.
- **[Changelog](CHANGELOG.md)**: Project release history and notable changes.
