import { buildQuestionReviewAnalysis } from "../lib/reviewBuilder";
import { McqQuestion, QuestionAttempt, PracticeSession, AdaptiveDecision } from "../lib/store";

describe("buildQuestionReviewAnalysis", () => {
  const mockQuestion: McqQuestion = {
    id: "q1",
    questionSetId: "set1",
    stem: "Test Question",
    correctOptionId: "opt1",
    correctAnswerExplanation: "Because it's correct",
    primaryConceptId: "concept1",
    primaryConceptLabel: "Test Concept",
    difficulty: "intermediate",
    highYieldTakeaway: "Takeaway",
    reasoningSteps: ["Step 1", "Step 2"],
    options: [
      { id: "opt1", label: "A", text: "Correct Option", isCorrect: true, explanation: "Correct explanation" },
      { id: "opt2", label: "B", text: "Wrong Option", isCorrect: false, explanation: "Wrong explanation", misconception: "Common Trap", whenItCouldBeCorrect: "If condition X" }
    ]
  };

  const mockAttempt: QuestionAttempt = {
    questionId: "q1",
    selectedOptionId: "opt2",
    attemptNumber: 1,
    timeSpentSeconds: 45,
    timestamp: Date.now(),
    hintsUsed: 0,
    confidence: "high"
  };

  const mockSession: PracticeSession = {
    id: "s1",
    startedAt: Date.now(),
    status: "in_progress",
    attempts: [],
    mode: "learning"
  };

  it("should generate a correct analysis for an incorrect attempt", () => {
    const analysis = buildQuestionReviewAnalysis(mockQuestion, mockAttempt, mockSession);
    
    expect(analysis.status).toBe("incorrect");
    expect(analysis.correctOptionId).toBe("opt1");
    expect(analysis.selectedOptionId).toBe("opt2");
    expect(analysis.confidenceInsight).toContain("High confidence in an incorrect answer");
    expect(analysis.selectedAnswerExplanation).toBe("Wrong explanation");
    expect(analysis.highYieldTakeaway).toBe("Takeaway");
    expect(analysis.reasoningFramework).toEqual(["Step 1", "Step 2"]);
    expect(analysis.optionAnalyses).toHaveLength(2);
    expect(analysis.optionAnalyses[1].misconception).toBe("Common Trap");
    expect(analysis.optionAnalyses[1].whenItCouldBeCorrect).toBe("If condition X");
  });

  it("should generate a correct analysis for a correct attempt", () => {
    const correctAttempt = { ...mockAttempt, selectedOptionId: "opt1", confidence: "low" as const };
    const analysis = buildQuestionReviewAnalysis(mockQuestion, correctAttempt, mockSession);
    
    expect(analysis.status).toBe("correct");
    expect(analysis.correctOptionId).toBe("opt1");
    expect(analysis.selectedOptionId).toBe("opt1");
    expect(analysis.confidenceInsight).toContain("Correct, but your low confidence");
    expect(analysis.selectedAnswerExplanation).toBeUndefined();
  });

  it("should map adaptive recommendations properly", () => {
    const adaptiveDecision: AdaptiveDecision = {
      id: "ad1",
      decisionKey: "concept1-intermediate",
      conceptId: "concept1",
      previousDifficulty: "intermediate",
      nextDifficulty: "beginner",
      decision: "decrease",
      purpose: "misconception-correction",
      timestamp: Date.now(),
      evidenceAttemptIds: ["q1"],
      stateSnapshot: {}
    };

    const analysis = buildQuestionReviewAnalysis(mockQuestion, mockAttempt, mockSession, adaptiveDecision);
    expect(analysis.adaptiveRecommendation).toContain("A beginner question is recommended next");
  });
});
