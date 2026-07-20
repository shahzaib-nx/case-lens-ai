# CaseLens AI API & Prompt Specifications

## Purpose

This document outlines the Next.js API routes that serve as the secure boundary between the browser and the AI provider (Groq) for CaseLens AI. It specifies the expected request structures, response schemas, and the underlying AI prompt logic used to generate educational content.

---

## Architectural Principle

The browser **never** calls the AI provider directly. All AI generation requests route through the Next.js backend, which ensures:
1. API keys are kept secure on the server.
2. Incoming requests are sanitized and validated.
3. AI responses are strictly forced into JSON formats.
4. AI responses are semantically validated before being sent back to the client.

All routes are `POST` endpoints located under `/api/`.

---

## 1. Case Analysis & Progressive Generation
**Endpoint:** `/api/analyze`

**Purpose:** Evaluates a raw clinical case for validity, generates a highly detailed educational analysis, and optionally breaks the case down into progressive reveal stages.

### Request Payload
```json
{
  "text": "The raw clinical narrative...",
  "caseFormat": "complete" // or "progressive"
}
```

### Prompt Strategy
The model is instructed to act as an expert medical tutor, evaluating if the case is valid, and then generating a ~2000-word Markdown analysis using H1-H6 headers, bullet points, and tables. 

If `caseFormat` is `progressive`, a secondary AI call is made to break the narrative into strict stages (presentation, history, examination, investigations, final-information) using ONLY facts explicitly present in the source text (no hallucinations).

### Expected AI Response Schema
```json
{
  "isValid": true,
  "analysis": "markdown string",
  "generatedTitle": "string",
  "progressiveGenerationStatus": "ready", // Only if requested
  "progressiveCase": { // Only if requested
    "version": 1,
    "stages": [
      {
        "id": "string",
        "order": 1,
        "type": "presentation",
        "title": "string",
        "content": "string",
        "sourceEvidence": [{ "quote": "exact substring from original text" }],
        "unavailableInformation": ["string"]
      }
    ],
    "generatedAt": "ISO string",
    "sourceNarrativeHash": "sha256 string"
  }
}
```

---

## 2. MCQ Generation
**Endpoint:** `/api/generate-mcqs`

**Purpose:** Generates case-specific, high-quality multiple choice questions based on the original narrative and the generated analysis.

### Request Payload
```json
{
  "caseStudyText": "string",
  "analysis": "string",
  "difficulty": "Basic | Intermediate | Advanced",
  "examStyle": "General | USMLE | MRCP | PLAB",
  "questionCount": 5,
  "adaptiveContext": { // Optional
    "conceptId": "string",
    "targetDifficulty": "string",
    "questionPurpose": "string"
  }
}
```

### Prompt Strategy
The AI is instructed to act as an educational medical reasoning assistant. It is supplied with explicit difficulty heuristics.
- **CRITICAL REQUIREMENT:** The model is strictly instructed to generate EXACTLY 4 options (1 correct, 3 incorrect distractors).
- If `adaptiveContext` is provided, critical adaptive review instructions are injected, forcing the model to generate questions strictly adhering to the weak concept identified in previous sessions.

### Expected AI Response Schema
```json
{
  "mcqs": [
    {
      "stem": "string",
      "options": [
        {
          "label": "string",
          "text": "string",
          "isCorrect": boolean,
          "explanation": "string",
          "misconception": "string (optional)",
          "whenItCouldBeCorrect": "string (optional)",
          "evidenceAgainst": ["string"]
        }
      ],
      "correctAnswerExplanation": "string",
      "decisiveClue": { "finding": "string", "explanation": "string" },
      "caseEvidence": ["string"],
      "reasoningFramework": ["string"],
      "highYieldTakeaway": "string",
      "primaryConceptId": "string",
      "primaryConceptLabel": "string",
      "secondaryConceptIds": ["string"],
      "conceptTags": [
        { "subject": "string", "topic": "string", "conceptId": "string", "conceptName": "string" }
      ],
      "difficulty": "string",
      "examStyle": "string",
      "adaptivePurpose": "string"
    }
  ]
}
```

---

## 3. Session Performance Analysis
**Endpoint:** `/api/analyze-performance`

**Purpose:** Analyzes a learner's MCQ attempts within a single session to derive strong concepts, weak concepts, and error patterns.

### Request Payload
```json
{
  "attemptsData": "Stringified JSON of recent question attempts and concept tags"
}
```

### Prompt Strategy
The AI must act as an educational data analyzer. It is instructed NOT to classify a learner as weak based on one isolated error without marking low confidence. All conclusions must be based strictly on the supplied attempt data.

### Expected AI Response Schema
```json
{
  "summary": "string",
  "strongConcepts": [
    { "conceptName": "string", "evidence": ["string"], "confidence": "string" }
  ],
  "weakConcepts": [
    { "conceptName": "string", "classification": "string", "priority": "string", "evidence": ["string"], "likelyIssue": "string", "recommendedStudyFocus": ["string"], "confidence": "string" }
  ],
  "errorPatterns": [
    { "type": "string", "explanation": "string" }
  ],
  "recommendedNextSteps": ["string"]
}
```

---

## 4. Overall Aggregate Analysis
**Endpoint:** `/api/generate-overall-analysis`

**Purpose:** Consumes deterministically calculated summaries and weakly classified concepts from the local aggregation engine to provide a qualitative, macro-level review of the learner's weaknesses in markdown format.

### Request Payload
```json
{
  "summary": {
    "uniqueCases": "number",
    "completedTests": "number",
    "totalQuestions": "number",
    "answeredQuestions": "number",
    "correct": "number",
    "incorrect": "number",
    "unanswered": "number",
    "overallScore": "number",
    "answeredAccuracy": "number",
    "confidenceRecordedCount": "number",
    "highConfidenceCorrect": "number",
    "moderateConfidenceCorrect": "number",
    "lowConfidenceCorrect": "number",
    "highConfidenceError": "number",
    "moderateConfidenceError": "number",
    "lowConfidenceError": "number",
    "confidenceNotRecorded": "number"
  },
  "weakConcepts": [
    {
      "conceptId": "string",
      "conceptLabel": "string",
      "totalAnswered": "number",
      "errorCount": "number",
      "highConfidenceErrorCount": "number",
      "accuracyPercentage": "number",
      "classification": "string"
    }
  ]
}
```

### Expected AI Response Schema
Returns a structured JSON object containing the raw generated markdown string.
```json
{
  "report": "Generated markdown text..."
}
```

---

## 5. Study Material Generation
**Endpoint:** `/api/generate-study-material`

**Purpose:** Generates focused educational study material for a specific weak concept identified during analysis.

### Request Payload
```json
{
  "weakConceptData": "Stringified weak concept object",
  "depth": "Standard | Deep"
}
```

### Prompt Strategy
The model builds fundamental material, compares commonly confused alternatives, creates a comparison table, and generates a worked example to bridge the learner's knowledge gap.

### Expected AI Response Schema
```json
{
  "objectives": ["string"],
  "coreExplanation": "string",
  "clinicalRelevance": "string",
  "keyFacts": ["string"],
  "comparisonTable": {
    "headers": ["string"],
    "rows": [["string"]]
  },
  "reasoningApproach": ["string"],
  "commonMistakes": ["string"],
  "examTraps": ["string"],
  "workedExample": { "case": "string", "reasoning": ["string"], "answer": "string" },
  "rapidReview": ["string"],
  "selfCheckQuestions": [{ "question": "string", "answer": "string" }],
  "focusedMcqs": [] // Same structure as regular MCQs
}
```

---

## 6. Example Case Generation
**Endpoint:** `/api/generate-example-case`

**Purpose:** Generates a realistic, short medical case study for quick practice.

### Prompt Strategy
Instructed to create a 3-5 sentence presentation (varying specialties, not always cardiology) with patient age, vitals, lab findings, and history, but strictly **excluding** the diagnosis.

### Expected AI Response Schema
```json
{
  "title": "A concise, descriptive title for the case",
  "content": "The raw text of the clinical scenario."
}
```

---

## 7. Differential Comparison (In Progress)
**Endpoint:** `/api/compare-differential`

**Purpose:** Compares a learner's submitted differential diagnosis against the AI-generated educational case analysis.

### Request Payload
```json
{
  "caseContext": {},
  "learnerDifferential": {
    "entries": [],
    "mostInfluentialFinding": "string",
    "influentialFindingReason": "string",
    "confidence": "Low | Moderate | High"
  }
}
```

### Prompt Strategy
The AI evaluates overlap, missing considerations, unsupported assumptions, and evidence weighting.
**CRITICAL SAFETY CONSTRAINT:** The AI is strictly instructed NOT to provide patient-specific medical advice, NOT to prescribe treatment, NOT to provide drug dosing, and NOT to state that the AI diagnosis is infallible.

### Expected AI Response Schema
```json
{
  "overlapSummary": "string",
  "alignedReasoning": ["string"],
  "missingConsiderations": ["string"],
  "unsupportedAssumptions": ["string"],
  "evidenceUseAnalysis": ["string"],
  "localisationAnalysis": "string (optional)",
  "uncertaintyAnalysis": "string (optional)",
  "learningPriorities": ["string"],
  "confidenceComment": "string (optional)"
}
```
