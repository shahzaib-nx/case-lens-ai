# CaseLens AI Privacy and Security Architecture

## Purpose

This document outlines the privacy guarantees, security boundaries, and data protection strategies implemented within CaseLens AI. It serves as an architectural guide for developers extending the platform, ensuring that new features do not compromise learner privacy or expose sensitive credentials.

---

## 1. The Security Boundary

### Next.js API Routes as a Protective Layer
CaseLens AI strictly enforces a secure boundary between the browser (the client) and external AI providers (Groq). 

- **No Direct API Calls:** The browser client **never** makes direct HTTP requests to Groq. Doing so would require shipping the `GROQ_API_KEY` to the client, leading to credential theft.
- **Server-Side Validation:** All AI generation requests route through the Next.js `/api/` endpoints. These routes are executed server-side.
- **Environment Variables:** External API keys are stored exclusively as server-side environment variables (`process.env.GROQ_API_KEY`) and are never prefixed with `NEXT_PUBLIC_`.

### AI Output Validation
AI output is fundamentally untrusted. Before generated content reaches the learner, the Next.js API layer forces the AI into a strict JSON schema and parses/validates the response using Zod. If the AI hallucinates invalid structures, the server intercepts the failure, preventing malicious or corrupted data injections into the application state.

---

## 2. Privacy Model & PII (Personally Identifiable Information)

### Fictional Case Mandate
CaseLens AI is an educational tool, not a clinical diagnostic system. 
- **Rule:** The platform should **never** be used to store, transmit, or analyze real, identifiable patient data (e.g., Electronic Health Records, unredacted clinical documents).
- **De-identification:** All case input should be explicitly fictionalized or heavily de-identified before submission.

### Zero PII Storage
The platform actively avoids storing direct identifiers:
- No patient names.
- No National Identity/Social Security numbers.
- No phone numbers, addresses, or hospital registration numbers.
- No unnecessary dates of birth.

*Future Feature Requirement:* Any future file upload workflows (e.g., uploading a case summary PDF) MUST implement mandatory malware scanning and automatic metadata stripping to prevent accidental PII leakage.

---

## 3. Storage & Data Ownership

### Current Local-First Architecture
In the current prototype, learner data (cases, practice sessions, question attempts, scores) is stored entirely locally on the user's device using browser `localStorage` (and soon, `IndexedDB`). 
- **Privacy by Default:** The learner's performance data, confidence scores, and historical attempts never leave their device.
- **No Analytics Tracking:** The platform does not currently deploy external telemetry, cookies, or tracking pixels to monitor user behavior.

### Future Cloud Synchronization Guarantees
When CaseLens AI eventually migrates to a cloud synchronization model (Phase 3 of the Data Architecture plan), it must adhere to strict controls:
1. **Authentication & Authorization:** Learners must authenticate to sync data. A rigorous Row-Level Security (RLS) policy must be enforced to ensure users can only read and write their own records.
2. **Encrypted Transport:** All synchronization must occur over strictly enforced TLS/HTTPS connections.
3. **Audit Logging:** Administrative operations and data migrations in the cloud must maintain secure, unalterable audit trails.

---

## 4. Copyright & Knowledge Base Security

In the future target architecture, CaseLens AI will ingest canonical medical resources (textbooks, guidelines). Security extends to protecting these intellectual property assets.

- **Private Object Storage:** Original copyrighted PDFs are stored in private buckets. They are never served directly to the public web.
- **Rights Enforcement:** Every ingested resource requires a strict `ResourceLicenceRecord`. The system programmatically checks this record. If a textbook's licence prohibits sending data to third-party AI models, the retrieval engine will physically block those chunks from being included in Groq API prompts.
- **Signed URLs:** If a learner needs to view a specific extracted figure, access must be brokered via temporary, signed URLs, preventing mass-scraping of the medical knowledge base.

---

## 5. Security Principles for Developers

When contributing to CaseLens AI, developers must adhere to the following rules:

1. **Never Trust the Client:** Assume any payload hitting the `/api/` routes could be maliciously crafted. Validate everything with Zod.
2. **Never Trust the AI:** Assume the LLM might generate inappropriate, malformed, or hostile text. Validate all outputs.
3. **No Secrets in the Browser:** Never hardcode secrets, API keys, database passwords, or JWT signing keys in the React frontend.
4. **Assume Local Storage is Public:** Data stored in `localStorage` or `IndexedDB` is easily accessible to anyone with physical access to the device or malicious browser extensions. Do not store sensitive tokens (like refresh tokens) without appropriate encryption or `HttpOnly` cookie strategies in the future cloud phase.
