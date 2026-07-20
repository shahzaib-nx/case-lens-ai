import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildQuestionReviewAnalysis } from "./reviewBuilder";

export function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Ignore and fallback
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export type AnswerOption = {
  id: string;
  label: "A" | "B" | "C" | "D" | "E";
  text: string;
  isCorrect: boolean;
  explanation: string;
  misconception?: string;
  evidenceAgainst?: string[];
  whenItCouldBeCorrect?: string;
};

export type ConceptTag = {
  subject: string;
  topic: string;
  subtopic?: string;
  conceptId: string; // The canonical ID (e.g. neurology.stroke.mca-localisation)
  conceptName: string;
  reasoningSkill?: string;
  cognitiveLevel?: "Recall" | "Understanding" | "Application" | "Analysis";
};

export type McqQuestion = {
  id: string;
  questionSetId?: string;
  questionVersion?: number;
  stem: string;
  options: AnswerOption[];
  correctOptionId: string;
  correctAnswerExplanation: string;
  decisiveClue?: {
    finding: string;
    explanation: string;
  };
  caseEvidence: string[];
  reasoningSteps?: string[];
  reasoningFramework?: string[];
  highYieldTakeaway?: string;
  commonTrap?: string;
  memoryAid?: string;
  primaryConceptId?: string;
  primaryConceptLabel?: string;
  secondaryConceptIds?: string[];
  conceptTags: ConceptTag[];
  difficulty?: DifficultyLevel;
  examStyle: "General" | "NRE" | "USMLE" | "PLAB" | "MRCP";
  adaptivePurpose?: AdaptiveQuestionPurpose;
};

export type DifferentialConfidence = "Low" | "Moderate" | "High";

export interface LearnerDifferentialEntry {
  id: string;
  role: "primary" | "alternative";
  interpretation: string;
  supportingFindings: string[];
  opposingFindings: string[];
  reasoningNote?: string;
}

export interface LearnerDifferentialDraft {
  entries: LearnerDifferentialEntry[];
  mostInfluentialFinding: string;
  influentialFindingReason: string;
  confidence?: DifferentialConfidence;
  updatedAt: string;
}

export interface DifferentialComparison {
  overlapSummary: string;
  alignedReasoning: string[];
  missingConsiderations: string[];
  unsupportedAssumptions: string[];
  evidenceUseAnalysis: string[];
  localisationAnalysis?: string;
  uncertaintyAnalysis?: string;
  learningPriorities: string[];
  confidenceComment?: string;
  generatedAt: string;
}

export interface LearnerDifferentialSubmission {
  id: string;
  entries: LearnerDifferentialEntry[];
  mostInfluentialFinding: string;
  influentialFindingReason: string;
  confidence: DifferentialConfidence;
  submittedAt: string;
  status:
    | "submitted"
    | "comparison-pending"
    | "comparison-complete"
    | "comparison-failed"
    | "skipped";
  comparison?: DifferentialComparison;
}


export type QuestionAttempt = {
  id?: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  answeredAt: string;
  attemptNumber: number;
  probableErrorType?: string;
  probableKnowledgeGap?: string;
  confidence?: "Low" | "Moderate" | "High";
  
  // Feature 4 additions (optional for backward compatibility)
  practiceMode?: PracticeMode;
  submissionReason?: "manual" | "question-time-expired" | "total-time-expired";
  unanswered?: boolean;
  hintsUsed?: number;
  timeSpentSeconds?: number;
};

export type PracticeMode = "learning" | "exam";

export type TimerMode = "none" | "per-question" | "total";

export type PracticeTimerConfig = {
  mode: TimerMode;
  secondsPerQuestion?: number;
  totalDurationSeconds?: number;
};

// Feature 5 Additions

export type DifficultyLevel = "Basic" | "Intermediate" | "Advanced";

export type AdaptiveDecisionType = "increase" | "maintain" | "decrease";

export type AdaptiveQuestionPurpose =
  | "standard"
  | "reinforcement"
  | "misconception-correction"
  | "confidence-reinforcement"
  | "advanced-integration";

export type AdaptiveReasonCode =
  | "repeated-correct"
  | "repeated-incorrect"
  | "repeated-high-confidence-error"
  | "high-confidence-error"
  | "correct-low-confidence"
  | "correct-with-hints"
  | "mixed-evidence"
  | "insufficient-evidence"
  | "difficulty-ceiling"
  | "difficulty-floor";

export type AdaptiveDecision = {
  id: string;
  decisionKey: string;
  conceptId: string;
  previousDifficulty: DifficultyLevel;
  nextDifficulty: DifficultyLevel;
  decision: AdaptiveDecisionType;
  purpose: AdaptiveQuestionPurpose;
  reasonCode: AdaptiveReasonCode;
  evidenceAttemptIds: string[];
  evidenceCount: number;
  ruleVersion: 1;
  createdAt: string;
};

export type PracticeSessionPurpose =
  | "standard"
  | "adaptive-review"
  | "weak-concept-review"
  | "retake";

export type PracticeSessionStatus = 
  | "not-started" 
  | "in-progress" 
  | "completed" 
  | "expired" 
  | "abandoned";

export type PracticeCompletionReason = 
  | "all-questions-completed" 
  | "finished-early" 
  | "total-time-expired" 
  | "user-ended-session";

export interface PracticeQuestionDraft {
  questionId: string;
  selectedOptionId?: string;
  confidence?: "Low" | "Moderate" | "High";
  updatedAt: string;
}

export type ConfidenceLevel = "Low" | "Moderate" | "High";
export type ErrorType = "Knowledge gap" | "Misread clinical clue" | "Localisation error" | "Differential comparison error" | "Recall failure" | "Overlooked negative finding" | "Premature closure" | "Confused similar conditions" | "Correct reasoning but uncertain" | "Time-pressure error" | "Unanswered";

export interface ConceptImpact {
  classification: "insufficient-evidence" | "possible-weakness" | "emerging-weakness" | "consistent-weakness" | "improving" | "strong";
  evidenceSummary: string;
  reviewPriority: "low" | "normal" | "high";
}

export interface QuestionReviewAnalysis {
  id: string;
  attemptId: string;
  questionId: string;
  questionSetId?: string;
  questionVersion?: number;

  status: "correct" | "incorrect" | "unanswered";
  selectedOptionId?: string;
  correctOptionId: string;

  confidence?: ConfidenceLevel;
  confidenceInsight: string;

  correctAnswerExplanation: string;
  selectedAnswerExplanation?: string;

  optionAnalyses: Array<{
    optionId: string;
    isCorrect: boolean;
    explanation: string;
    misconception?: string;
    whenItCouldBeCorrect?: string;
  }>;

  decisiveClue?: {
    finding: string;
    explanation: string;
  };

  reasoningFramework?: string[];
  probableErrorType?: ErrorType;

  primaryConceptId?: string;
  primaryConceptLabel?: string;
  secondaryConceptIds?: string[];

  conceptImpact?: ConceptImpact;
  adaptiveDecisionId?: string;
  adaptiveRecommendation?: string;
  difficulty?: DifficultyLevel;

  hintsUsed?: number;
  timeSpentSeconds?: number;
  submissionReason?: string;

  highYieldTakeaway?: string;
  comparisonRule?: string;

  analysisVersion: 1;
  createdAt: string;
}

export interface PracticeSession {
  id: string;
  caseId: string;
  questionSetId?: string;
  questionSetVersion?: number;
  questionIds: string[]; // Immutable reference to questions used
  mode: PracticeMode;
  purpose?: PracticeSessionPurpose;
  adaptiveContext?: {
    conceptId: string;
    targetDifficulty: DifficultyLevel;
    questionPurpose: AdaptiveQuestionPurpose;
    sourceDecisionId: string;
  };
  status: PracticeSessionStatus;
  completionReason?: PracticeCompletionReason;
  timerConfig: PracticeTimerConfig;
  
  currentQuestionIndex: number;
  currentDraft?: PracticeQuestionDraft;
  
  attempts: QuestionAttempt[];
  questionAnalyses?: QuestionReviewAnalysis[];
  
  startedAt?: string;
  expiresAt?: string;
  currentQuestionStartedAt?: string;
  currentQuestionExpiresAt?: string;
  completedAt?: string;
  abandonedAt?: string;
}

// Progressive Reveal Types

export type ProgressiveGenerationStatus =
  | "not-requested"
  | "pending"
  | "ready"
  | "failed";

export type ProgressiveStageType =
  | "presentation"
  | "history"
  | "examination"
  | "investigations"
  | "final-information";

export interface ProgressiveCaseStage {
  id: string;
  order: number;
  type: ProgressiveStageType;
  title: string;
  content: string;
  sourceEvidence: { quote: string }[];
  unavailableInformation?: string[];
}

export interface ProgressiveCase {
  version: 1;
  sourceNarrativeHash: string;
  stages: ProgressiveCaseStage[];
  generatedAt: string;
}

export type ProgressiveSessionStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "skipped";

export interface ProgressiveStageResponse {
  id: string;
  stageId: string;
  stageOrder: number;
  leadingInterpretation: string;
  alternativeInterpretation?: string;
  requestedInformation: string;
  mostImportantClue: string;
  differentialChanged: "initial" | "yes" | "no" | "uncertain";
  changeExplanation?: string;
  confidence: "Low" | "Moderate" | "High";
  submittedAt: string;
}

export interface ProgressiveSession {
  status: ProgressiveSessionStatus;
  currentStageIndex: number;
  stageResponses: ProgressiveStageResponse[];
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
}

export interface ProgressiveStageDraft {
  stageId: string;
  leadingInterpretation: string;
  alternativeInterpretation?: string;
  requestedInformation: string;
  mostImportantClue: string;
  differentialChanged?: "initial" | "yes" | "no" | "uncertain";
  changeExplanation?: string;
  confidence?: "Low" | "Moderate" | "High";
  updatedAt: string;
}

export type ConceptPerformance = {
  conceptId: string;
  conceptName: string;
  subject: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  weaknessScore: number;
  classification:
    | "Possible weakness"
    | "Emerging weakness"
    | "Consistent weakness"
    | "Improving concept"
    | "Strong concept"
    | "Insufficient evidence";
  confidence: "Low" | "Moderate" | "High";
  evidence: string[];
  likelyMisconceptions: string[];
  lastUpdatedAt: string;
};

export type StudyMaterial = {
  id: string;
  caseId: string;
  conceptId: string;
  conceptName: string;
  depth: "Quick" | "Standard" | "Deep";
  whySelected: string;
  objectives: string[];
  coreExplanation: string;
  clinicalRelevance: string;
  keyFacts: string[];
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
  reasoningApproach: string[];
  commonMistakes: string[];
  examTraps: string[];
  memoryAid?: string;
  workedExample?: {
    case: string;
    reasoning: string[];
    answer: string;
  };
  rapidReview: string[];
  selfCheckQuestions: {
    question: string;
    answer: string;
  }[];
  focusedMcqs: McqQuestion[];
  generatedAt: string;
};

// Legacy support for older cases
export type LegacyOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type LegacyQuestion = {
  id: string;
  text: string;
  options: LegacyOption[];
};

export type CaseStudy = {
  id: string;
  title: string;
  content: string;
  difficulty?: string;
  examStyle?: string;
  questionCount?: number;
  analysis?: string;
  
  // Legacy fields
  questions?: LegacyQuestion[]; 
  
  // New unified fields
  mcqs?: McqQuestion[];
  attempts?: QuestionAttempt[]; // Legacy attempts collection
  practiceSessions?: PracticeSession[];
  
  // Practice Mode Settings (Defaults for next session)
  practiceMode?: PracticeMode;
  timerConfig?: PracticeTimerConfig;
  adaptiveDifficultyEnabled?: boolean;
  adaptiveDecisions?: AdaptiveDecision[];

  studyMaterials?: StudyMaterial[];

  answers?: Record<string, string>; // questionId -> optionId
  score?: number;
  createdAt: number;

  // Differential Builder Fields
  differentialBuilderEnabled?: boolean;
  analysisRevealStatus?: "hidden" | "revealed";
  differentialDraft?: LearnerDifferentialDraft;
  differentialSubmission?: LearnerDifferentialSubmission;

  // Progressive Reveal Fields
  caseFormat?: "complete" | "progressive";
  progressiveGenerationStatus?: ProgressiveGenerationStatus;
  progressiveCase?: ProgressiveCase;
  progressiveSession?: ProgressiveSession;
  progressiveDraft?: ProgressiveStageDraft;
};

export function getCaseFormat(caseStudy: CaseStudy): "complete" | "progressive" {
  return caseStudy.caseFormat ?? "complete";
}

export function isDifferentialBuilderEnabled(caseStudy: CaseStudy): boolean {
  return caseStudy.differentialBuilderEnabled === true;
}

export function getAnalysisRevealStatus(caseStudy: CaseStudy): "hidden" | "revealed" {
  return caseStudy.analysisRevealStatus ?? "revealed";
}

interface CaseStore {
  cases: CaseStudy[];
  conceptPerformances: Record<string, ConceptPerformance>;
  globalAnalysis: string | null;
  
  addCase: (caseStudy: CaseStudy) => void;
  updateCase: (id: string, updates: Partial<CaseStudy>) => void;
  deleteCase: (id: string) => void;
  clearAllCases: () => void;
  
  updateConceptPerformance: (performance: ConceptPerformance) => void;
  setConceptPerformances: (performances: Record<string, ConceptPerformance>) => void;
  setGlobalAnalysis: (analysis: string | null) => void;

  updateDifferentialDraft: (caseId: string, draft: LearnerDifferentialDraft | undefined) => void;
  submitDifferential: (caseId: string, submission: LearnerDifferentialSubmission) => void;
  skipDifferential: (caseId: string) => void;
  saveDifferentialComparison: (caseId: string, comparison: DifferentialComparison) => void;
  markDifferentialComparisonFailed: (caseId: string) => void;

  updateProgressiveDraft: (caseId: string, draft: ProgressiveStageDraft | undefined) => void;
  submitProgressiveStage: (caseId: string, response: ProgressiveStageResponse) => void;
  skipProgressiveReview: (caseId: string) => void;
  completeProgressiveReview: (caseId: string) => void;
  initProgressiveSession: (caseId: string) => void;

  createPracticeSession: (caseId: string, mode: PracticeMode, timerConfig: PracticeTimerConfig, purpose?: PracticeSessionPurpose, adaptiveContext?: PracticeSession["adaptiveContext"]) => string; // returns sessionId
  startPracticeSession: (caseId: string, sessionId: string) => void;
  updatePracticeDraft: (caseId: string, sessionId: string, draft: PracticeQuestionDraft | undefined) => void;
  submitPracticeAttempt: (caseId: string, sessionId: string, attempt: QuestionAttempt) => void;
  advancePracticeQuestion: (caseId: string, sessionId: string) => void;
  completePracticeSession: (caseId: string, sessionId: string, reason: PracticeCompletionReason) => void;
  saveAdaptiveDecision: (caseId: string, decision: AdaptiveDecision) => void;
}

export const useCaseStore = create<CaseStore>()(
  persist(
    (set) => ({
      cases: [],
      conceptPerformances: {},
      globalAnalysis: null,
      
      addCase: (caseStudy) =>
        set((state) => ({ cases: [caseStudy, ...state.cases] })),
        
      updateCase: (id, updates) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
        
      deleteCase: (id) =>
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id),
        })),
        
      clearAllCases: () => set({ cases: [], conceptPerformances: {} }),
      
      updateConceptPerformance: (performance) => 
        set((state) => ({
          conceptPerformances: {
            ...state.conceptPerformances,
            [performance.conceptId]: performance
          }
        })),
        
      setConceptPerformances: (performances) =>
        set(() => ({ conceptPerformances: performances })),
        
      setGlobalAnalysis: (analysis) =>
        set(() => ({ globalAnalysis: analysis })),
        
      updateDifferentialDraft: (caseId, draft) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? { ...c, differentialDraft: draft } : c
          ),
        })),

      submitDifferential: (caseId, submission) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  differentialSubmission: submission,
                  differentialDraft: undefined,
                  analysisRevealStatus: "revealed",
                }
              : c
          ),
        })),

      skipDifferential: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  differentialSubmission: {
                    id: generateId(),
                    entries: [],
                    mostInfluentialFinding: "",
                    influentialFindingReason: "",
                    confidence: "Low", // Default placeholder for skipped
                    submittedAt: new Date().toISOString(),
                    status: "skipped",
                  },
                  analysisRevealStatus: "revealed",
                }
              : c
          ),
        })),

      saveDifferentialComparison: (caseId, comparison) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.differentialSubmission) {
              return {
                ...c,
                differentialSubmission: {
                  ...c.differentialSubmission,
                  status: "comparison-complete",
                  comparison,
                },
              };
            }
            return c;
          }),
        })),

      markDifferentialComparisonFailed: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId && c.differentialSubmission
              ? {
                  ...c,
                  differentialSubmission: {
                    ...c.differentialSubmission,
                    status: "comparison-failed",
                  },
                }
              : c
          ),
        })),

      updateProgressiveDraft: (caseId, draft) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? { ...c, progressiveDraft: draft } : c
          ),
        })),

      initProgressiveSession: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.progressiveCase && !c.progressiveSession) {
              return {
                ...c,
                progressiveSession: {
                  status: "in-progress",
                  currentStageIndex: 0,
                  stageResponses: [],
                  startedAt: new Date().toISOString(),
                },
              };
            }
            return c;
          }),
        })),

      submitProgressiveStage: (caseId, response) =>
        set((state) => {
          return {
            cases: state.cases.map((c) => {
              if (c.id !== caseId || !c.progressiveSession) return c;
              
              if (c.progressiveSession.status === "completed") {
                console.error("Progressive session is not accepting responses.");
                return c;
              }

              const alreadySubmitted = c.progressiveSession.stageResponses.some(
                (item) => item.stageId === response.stageId
              );

              if (alreadySubmitted) {
                console.error("A response has already been submitted for this stage.");
                return c;
              }

              return {
                ...c,
                progressiveDraft: undefined,
                progressiveSession: {
                  ...c.progressiveSession,
                  stageResponses: [...c.progressiveSession.stageResponses, response],
                  currentStageIndex: c.progressiveSession.currentStageIndex + 1,
                },
              };
            }),
          };
        }),

      skipProgressiveReview: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.progressiveSession) {
              return {
                ...c,
                progressiveSession: {
                  ...c.progressiveSession,
                  status: "skipped",
                  skippedAt: new Date().toISOString(),
                },
                // Unhide the analysis automatically when skipped
                analysisRevealStatus: "revealed",
              };
            }
            return c;
          }),
        })),

      completeProgressiveReview: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.progressiveSession) {
              return {
                ...c,
                progressiveSession: {
                  ...c.progressiveSession,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                },
              };
            }
            return c;
          }),
        })),
        
      createPracticeSession: (caseId, mode, timerConfig, purpose = "standard", adaptiveContext) => {
        const id = generateId();
        set((state) => {
          const newCases = state.cases.map((c) => {
            if (c.id === caseId) {
              const questionIds = c.mcqs ? c.mcqs.map((q) => q.id) : (c.questions ? c.questions.map((q) => q.id) : []);

              const session: PracticeSession = {
                id,
                caseId,
                mode,
                purpose,
                adaptiveContext,
                timerConfig,
                status: "not-started",
                questionIds,
                currentQuestionIndex: 0,
                attempts: [],
              };
              
              return {
                ...c,
                practiceSessions: [...(c.practiceSessions || []), session],
              };
            }
            return c;
          });
          return { cases: newCases };
        });
        return id;
      },

      saveAdaptiveDecision: (caseId, decision) => {
        set((state) => {
          const c = state.cases.find((c) => c.id === caseId);
          if (!c) return state;

          const existingDecisions = c.adaptiveDecisions || [];
          
          // Idempotency check
          if (existingDecisions.some(d => d.decisionKey === decision.decisionKey)) {
            return state;
          }

          const updatedCase = {
            ...c,
            adaptiveDecisions: [...existingDecisions, decision],
          };

          return {
            cases: state.cases.map((cs) => (cs.id === caseId ? updatedCase : cs)),
          };
        });
      },

      startPracticeSession: (caseId, sessionId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.practiceSessions) {
              return {
                ...c,
                practiceSessions: c.practiceSessions.map((s) => {
                  if (s.id === sessionId && s.status === "not-started") {
                    const now = new Date();
                    let expiresAt = undefined;
                    let currentQuestionExpiresAt = undefined;
                    
                    if (s.timerConfig.mode === "total" && s.timerConfig.totalDurationSeconds) {
                      expiresAt = new Date(now.getTime() + s.timerConfig.totalDurationSeconds * 1000).toISOString();
                    } else if (s.timerConfig.mode === "per-question" && s.timerConfig.secondsPerQuestion) {
                      currentQuestionExpiresAt = new Date(now.getTime() + s.timerConfig.secondsPerQuestion * 1000).toISOString();
                    }
                    
                    return {
                      ...s,
                      status: "in-progress",
                      startedAt: now.toISOString(),
                      expiresAt,
                      currentQuestionStartedAt: now.toISOString(),
                      currentQuestionExpiresAt,
                    };
                  }
                  return s;
                }),
              };
            }
            return c;
          }),
        })),

      updatePracticeDraft: (caseId, sessionId, draft) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.practiceSessions) {
              return {
                ...c,
                practiceSessions: c.practiceSessions.map((s) =>
                  s.id === sessionId ? { ...s, currentDraft: draft } : s
                ),
              };
            }
            return c;
          }),
        })),

      submitPracticeAttempt: (caseId, sessionId, attempt) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.practiceSessions) {
              return {
                ...c,
                practiceSessions: c.practiceSessions.map((s) => {
                  if (s.id === sessionId) {
                    if (s.status === "completed" || s.status === "expired") return s;
                    
                    if (!attempt.id) {
                      attempt.id = generateId();
                    }

                    // Idempotent attempt check
                    const existingAttempt = s.attempts.find((a) => a.id === attempt.id || (a.questionId === attempt.questionId && a.attemptNumber === attempt.attemptNumber));
                    if (existingAttempt) return s;

                    // Idempotent review check
                    let questionAnalyses = s.questionAnalyses || [];
                    const existingReview = questionAnalyses.find(r => r.attemptId === attempt.id);
                    
                    if (!existingReview) {
                      const mcqsArray = c.mcqs || c.questions || [];
                      const question = mcqsArray.find((q, idx) => (q.id || `q-${idx}`) === attempt.questionId);
                      if (question) {
                        const mcq = question as unknown as McqQuestion;
                        const conceptAdaptiveDecision = c.adaptiveDecisions?.find(d => 
                          d.conceptId === (mcq.primaryConceptId || mcq.conceptTags?.[0]?.conceptId)
                          && d.evidenceAttemptIds.includes(attempt.id!)
                        );
                        
                        const review = buildQuestionReviewAnalysis(mcq, attempt, s, conceptAdaptiveDecision);
                        questionAnalyses = [...questionAnalyses, review];
                      }
                    }

                    return {
                      ...s,
                      attempts: [...s.attempts, attempt],
                      questionAnalyses,
                      currentDraft: undefined,
                    };
                  }
                  return s;
                }),
              };
            }
            return c;
          }),
        })),

      advancePracticeQuestion: (caseId, sessionId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.practiceSessions) {
              return {
                ...c,
                practiceSessions: c.practiceSessions.map((s) => {
                  if (s.id === sessionId && s.status !== "completed" && s.status !== "expired") {
                    const now = new Date();
                    let currentQuestionExpiresAt = undefined;
                    if (s.timerConfig.mode === "per-question" && s.timerConfig.secondsPerQuestion) {
                      currentQuestionExpiresAt = new Date(now.getTime() + s.timerConfig.secondsPerQuestion * 1000).toISOString();
                    }
                    
                    return {
                      ...s,
                      currentQuestionIndex: s.currentQuestionIndex + 1,
                      currentQuestionStartedAt: now.toISOString(),
                      currentQuestionExpiresAt,
                    };
                  }
                  return s;
                }),
              };
            }
            return c;
          }),
        })),

      completePracticeSession: (caseId, sessionId, reason) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId && c.practiceSessions) {
              return {
                ...c,
                practiceSessions: c.practiceSessions.map((s) => {
                  if (s.id === sessionId && s.status !== "completed" && s.status !== "expired") {
                    const status = reason === "total-time-expired" ? "expired" : "completed";
                    return {
                      ...s,
                      status,
                      completionReason: reason,
                      completedAt: new Date().toISOString(),
                    };
                  }
                  return s;
                }),
              };
            }
            return c;
          }),
        })),
    }),
    {
      name: "caselens-storage",
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // If migrating from version 0 (or undefined) to 1
        if (version === 0 || version === undefined) {
          return persistedState as CaseStore;
        }
        return persistedState as CaseStore;
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function createReadOnlyLegacySession(caseStudy: CaseStudy): PracticeSession {
  const questions = caseStudy.mcqs || caseStudy.questions || [];
  const questionIds = questions.map((q: any) => q.id).filter(Boolean);
  
  const attempts = caseStudy.attempts || [];
  
  return {
    id: "legacy-session",
    caseId: caseStudy.id,
    questionIds,
    mode: "learning", // Legacy behavior matches learning mode
    status: "completed",
    timerConfig: { mode: "none" },
    currentQuestionIndex: questionIds.length,
    attempts,
    startedAt: caseStudy.createdAt ? new Date(caseStudy.createdAt).toISOString() : new Date().toISOString(),
    completedAt: caseStudy.createdAt ? new Date(caseStudy.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function getLatestSession(caseData: CaseStudy): PracticeSession | undefined {
  if (!caseData.practiceSessions || caseData.practiceSessions.length === 0) return undefined;
  
  // Sort by completedAt first, then startedAt, then by number of attempts
  return [...caseData.practiceSessions].sort((a, b) => {
    // 1. If one has attempts and the other doesn't, prioritize the one with attempts
    if (a.attempts.length > 0 && b.attempts.length === 0) return -1;
    if (b.attempts.length > 0 && a.attempts.length === 0) return 1;
    
    // 2. Prioritize completed sessions over non-completed ones
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : (a.startedAt ? new Date(a.startedAt).getTime() : 0);
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : (b.startedAt ? new Date(b.startedAt).getTime() : 0);
    
    return bTime - aTime;
  })[0];
}

export function getPracticeSessions(caseStudy: CaseStudy): PracticeSession[] {
  if (caseStudy.practiceSessions && caseStudy.practiceSessions.length > 0) {
    return caseStudy.practiceSessions;
  }
  
  if (caseStudy.attempts && caseStudy.attempts.length > 0) {
    return [createReadOnlyLegacySession(caseStudy)];
  }
  
  return [];
}
