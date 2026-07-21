import OpenAI from "openai";
import { z } from "zod";
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export function hashCurrentNarrative(text: string): string {
  return cyrb53(text.trim()).toString(16);
}

function normalizeSourceText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function validateSourceEvidence(narrative: string, stages: any[]): boolean {
  const normalizedNarrative = normalizeSourceText(narrative);
  return stages.every((stage) =>
    stage.sourceEvidence &&
    Array.isArray(stage.sourceEvidence) &&
    stage.sourceEvidence.every((ev: any) =>
      ev.quote && normalizedNarrative.includes(normalizeSourceText(ev.quote))
    )
  );
}

const progressiveCaseStageSchema = z.object({
  id: z.string().min(1).max(100),
  order: z.number().int().min(1).max(5),
  type: z.enum([
    "presentation",
    "history",
    "examination",
    "investigations",
    "final-information",
  ]),
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(10).max(4000),
  sourceEvidence: z
    .array(z.object({ quote: z.string().trim().min(1).max(500) }))
    .min(1)
    .max(30),
  unavailableInformation: z
    .array(z.string().trim().min(1).max(300))
    .max(20)
    .optional(),
});

const progressiveCaseSchema = z.object({
  version: z.literal(1),
  stages: z.array(progressiveCaseStageSchema).min(2).max(5),
  generatedAt: z.string(),
});

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GROQ_API_KEY is not set in the environment variables.");
}

function getAiClient() {
  return new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1"
  });
}

// Since some OpenAI-compatible models (like Grok) don't fully support structured outputs via json_schema,
// we will instruct the model to return a JSON object, and rely on standard JSON response formatting.
async function safeChatCompletion(prompt: string, model: string = "llama-3.3-70b-versatile", temperature: number = 0.2, maxRetries: number = 2) {
  const ai = getAiClient();
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await ai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        response_format: { type: "json_object" },
      });
      
      const text = response.choices[0].message.content;
      if (!text) throw new Error("No response text from AI.");
      return JSON.parse(text);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`AI request or JSON parse failed, retrying (${attempt + 1}/${maxRetries})...`, error);
      attempt++;
    }
  }
}

export async function analyzeCaseStudy(caseStudyText: string) {
  try {
    const prompt = `Analyze the following case study. Determine if it is a valid medical/educational case study with sufficient information.
If valid, provide a highly detailed, comprehensive clinical analysis (aim for approximately 2000 words).
You MUST format your response using rich Markdown syntax:
- Use Headings (H1 to H6) to structure the document.
- Use bullet points and numbered lists for readability.
- Use Markdown tables for comparing differentials, lab values, or treatment options.
- Bold key terms and medications.

IMPORTANT: You MUST return a raw JSON object with the following exact schema:
{
  "isValid": boolean,
  "analysis": "markdown string",
  "generatedTitle": "string"
}

Case Study:
${caseStudyText}`;

    const data = await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
    return data as { isValid: boolean; analysis: string; generatedTitle?: string };
  } catch (error) {
    console.error("Error analyzing case study:", error);
    return {
      isValid: true,
      analysis: "AI service unavailable. This case presents educational points but requires AI integration to fully evaluate.",
    };
  }
}

export async function generateMCQs(
  caseStudyText: string, 
  analysis: string,
  difficulty: string = "Intermediate",
  examStyle: string = "General",
  questionCount: number = 5,
  adaptiveContext?: {
    conceptId: string;
    targetDifficulty: string;
    questionPurpose: string;
  },
  avoidQuestionIds?: string[]
) {
  try {
    const targetDifficulty = adaptiveContext ? adaptiveContext.targetDifficulty : difficulty;
    
    let difficultyCriteria = "";
    if (targetDifficulty === "Basic") {
      difficultyCriteria = "Basic: Direct recognition of one principal concept with clear clues. Focus on foundational knowledge.";
    } else if (targetDifficulty === "Intermediate") {
      difficultyCriteria = "Intermediate: Clinical application requiring comparison or synthesis of several clues. Requires more than simple recall.";
    } else {
      difficultyCriteria = "Advanced: Integration of subtle findings, competing alternatives, or multi-step reasoning. Designed to challenge strong test-takers.";
    }

    let adaptiveInstructions = "";
    if (adaptiveContext) {
      adaptiveInstructions = `
CRITICAL ADAPTIVE REVIEW INSTRUCTIONS:
This is an adaptive review batch explicitly focused on the concept: "${adaptiveContext.conceptId}".
The purpose of this batch is: "${adaptiveContext.questionPurpose}".
All generated questions MUST strictly adhere to this concept and purpose.
You MUST generate exactly ${questionCount} questions for this specific concept.
Do NOT generate questions outside of this concept.`;
    }

    const prompt = `You are an educational medical reasoning assistant. Your task is to explain medical multiple-choice questions for students.
Generate exactly ${questionCount} high-quality multiple choice questions based on the following case study and its analysis.
The questions must be written in the style of ${examStyle} examinations.
CRITICAL: Every single question MUST have exactly 4 options (one correct answer and exactly three incorrect distractors). Do NOT generate 3 or 5 options.
The difficulty of ALL questions MUST be strictly: ${targetDifficulty}.

Difficulty Heuristics:
${difficultyCriteria}
${adaptiveInstructions}

IMPORTANT: You MUST return a raw JSON object containing an array called "mcqs" matching this structure precisely:
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
      ], // CRITICAL: This array MUST contain EXACTLY 4 items.
      "correctAnswerExplanation": "string",
      "decisiveClue": {
        "finding": "string",
        "explanation": "string"
      },
      "caseEvidence": ["string"],
      "reasoningFramework": ["string"],
      "highYieldTakeaway": "string",
      "primaryConceptId": "string",
      "primaryConceptLabel": "string",
      "secondaryConceptIds": ["string"],
      "conceptTags": [
        {
          "subject": "string",
          "topic": "string",
          "conceptId": "string",
          "conceptName": "string"
        }
      ],
      "difficulty": "${targetDifficulty}",
      "examStyle": "string",
      "adaptivePurpose": "${adaptiveContext ? adaptiveContext.questionPurpose : "standard"}"
    }
  ]
}

Case Study:
${caseStudyText}

Analysis:
${analysis}`;

    const data = await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
    
    // Add unique IDs and validate semantic criteria locally 
    // We expect caller to run this with retry logic if needed.
    const rawMcqs = data.mcqs || data;
    
    return rawMcqs;
  } catch (error) {
    console.error("Error generating MCQs:", error);
    throw error;
  }
}

export async function analyzePerformance(attemptsData: string) {
  try {
    const prompt = `Analyse the learner’s MCQ attempts as educational performance data.
Identify strong concepts, possible weak concepts, repeated weaknesses, improving concepts, common error patterns, likely misconceptions, and recommended study priorities.
Base every conclusion on supplied question attempts and concept tags. Do not classify a learner as weak based on one isolated error without marking low confidence.

IMPORTANT: You MUST return a raw JSON object with the following schema:
{
  "summary": "string",
  "strongConcepts": [{"conceptName": "string", "evidence": ["string"], "confidence": "string"}],
  "weakConcepts": [{"conceptName": "string", "classification": "string", "priority": "string", "evidence": ["string"], "likelyIssue": "string", "recommendedStudyFocus": ["string"], "confidence": "string"}],
  "errorPatterns": [{"type": "string", "explanation": "string"}],
  "recommendedNextSteps": ["string"]
}

Data:
${attemptsData}`;

    return await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
  } catch (error) {
    console.error("Error analyzing performance:", error);
    throw error;
  }
}

export async function generateStudyMaterial(weakConceptData: string, depth: string) {
  try {
    const prompt = `Generate focused educational study material for a medical student based on the supplied weak concept, question errors, misconceptions, exam style, difficulty, and selected study depth: ${depth}.
The material must address the learner’s demonstrated errors, explain the concept clearly, build from fundamentals, compare commonly confused alternatives, include a short worked example, self-check questions, and new focused MCQs.

IMPORTANT: You MUST return a raw JSON object with the following structure:
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
  "workedExample": {
    "case": "string",
    "reasoning": ["string"],
    "answer": "string"
  },
  "rapidReview": ["string"],
  "selfCheckQuestions": [{"question": "string", "answer": "string"}],
  "focusedMcqs": [ /* same structure as regular mcqs array */ ]
}

Data:
${weakConceptData}`;

    return await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.3);
  } catch (error) {
    console.error("Error generating study material:", error);
    throw error;
  }
}

export async function generateRandomCase(): Promise<{title: string; content: string}> {
  try {
    const prompt = `Generate a realistic, short (3-5 sentences) medical case study. It should be suitable for a medical student to analyze. 
Make it varied—do not always do cardiology. Include patient age, presentation, key vitals or lab findings, and relevant history. 
Do not include the diagnosis. Just the presentation.

IMPORTANT: You MUST return a raw JSON object matching this exact schema:
{
  "title": "A concise, descriptive title for the case",
  "content": "The raw text of the clinical scenario."
}`;

    return await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
  } catch (error) {
    console.error("Error generating example case:", error);
    throw error;
  }
}

export async function generateProgressiveCase(caseNarrative: string, maxStages: number = 5, retryCount = 0): Promise<any> {
  try {
    const prompt = `You are structuring a user-supplied educational clinical case into progressive reveal stages.
Use only facts explicitly present in the supplied case narrative.
Do not invent, infer, complete, or add medical findings.
Do not provide a diagnosis, educational interpretation, management recommendation, or answer-revealing commentary.

Organise available information into up to ${maxStages} stages:
1. presentation
2. history
3. examination
4. investigations
5. final-information

Use fewer stages when the source case lacks information for all categories.
Preserve clinically important positive and negative findings.
Do not move later findings into earlier stages when doing so would remove the intended progression.

IMPORTANT: You MUST return a raw JSON object with the following exact schema:
{
  "version": 1,
  "stages": [
    {
      "id": "string",
      "order": number,
      "type": "presentation" | "history" | "examination" | "investigations" | "final-information",
      "title": "string",
      "content": "string",
      "sourceEvidence": [
        { "quote": "exact matching substring from the case narrative" }
      ],
      "unavailableInformation": ["string"]
    }
  ],
  "generatedAt": "ISO date string"
}

Every quote in sourceEvidence must be a direct substring from the supplied narrative.
If a category is not represented, omit that stage rather than inventing content.

Case Narrative:
${caseNarrative}`;

    const data = await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
    
    // Validate schema
    const parsed = progressiveCaseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error("Schema validation failed for progressive stages.");
    }
    
    // Validate semantic source evidence
    if (!validateSourceEvidence(caseNarrative, parsed.data.stages)) {
      throw new Error("Source evidence semantic validation failed. The model hallucinated quotes.");
    }

    return {
      ...parsed.data,
      sourceNarrativeHash: hashCurrentNarrative(caseNarrative)
    };
  } catch (error) {
    if (retryCount < 1) {
      console.warn("Retrying progressive stage generation after failure:", error);
      return generateProgressiveCase(caseNarrative, maxStages, retryCount + 1);
    }
    console.error("Error generating progressive stages after retry:", error);
    throw error;
  }
}

export const compareDifferentialRequestSchema = z.object({
  caseId: z.string().min(1).max(200),
  differential: z.object({
    entries: z
      .array(
        z.object({
          role: z.enum(["primary", "alternative"]),
          interpretation: z.string().trim().min(2).max(500),
          supportingFindings: z
            .array(z.string().trim().min(1).max(500))
            .max(10),
          opposingFindings: z
            .array(z.string().trim().min(1).max(500))
            .max(10),
          reasoningNote: z
            .string()
            .trim()
            .max(1500)
            .optional(),
        }),
      )
      .min(2)
      .max(3),
    mostInfluentialFinding: z
      .string()
      .trim()
      .min(2)
      .max(1000),
    influentialFindingReason: z
      .string()
      .trim()
      .min(2)
      .max(1500),
    confidence: z.enum(["Low", "Moderate", "High"]),
  }),
});

export async function compareDifferential(caseContext: any, learnerDifferential: any) {
  try {
    const prompt = `You are an educational medical reasoning assistant.
Compare the learner’s submitted differential with the validated educational case analysis.
Do not treat the generated analysis as infallible.

Identify:
- Areas of overlap
- Reasoning that is supported by the supplied case
- Relevant alternatives the learner omitted
- Assumptions not supported by the supplied case
- Appropriate use of positive findings
- Appropriate use of negative findings
- Localisation strengths or errors
- Evidence-weighting issues
- Whether uncertainty was handled appropriately
- Focused learning priorities

Do not:
- Provide patient-specific medical advice
- Prescribe treatment
- Provide drug dosing
- State that the learner is definitely wrong
- State that the AI diagnosis is confirmed
- Invent findings not present in the case
- Make psychological claims about the learner

Use cautious educational language.

IMPORTANT: You MUST return a raw JSON object matching this exact schema:
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

Educational Analysis / Case Context:
${JSON.stringify(caseContext, null, 2)}

Learner Differential:
${JSON.stringify(learnerDifferential, null, 2)}`;

    return await safeChatCompletion(prompt, "llama-3.3-70b-versatile", 0.2);
  } catch (error) {
    console.error("Error generating differential comparison:", error);
    throw error;
  }
}

