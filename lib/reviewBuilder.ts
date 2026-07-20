import {
  McqQuestion,
  QuestionAttempt,
  QuestionReviewAnalysis,
  ConceptImpact,
  ErrorType,
  ConfidenceLevel,
  AdaptiveDecision,
  PracticeSession,
  generateId
} from "./store";

export function buildQuestionReviewAnalysis(
  question: McqQuestion,
  attempt: QuestionAttempt,
  session: PracticeSession,
  conceptAdaptiveDecision?: AdaptiveDecision
): QuestionReviewAnalysis {
  const selectedOption = attempt.selectedOptionId
    ? question.options.find((o) => o.id === attempt.selectedOptionId)
    : undefined;
  
  const correctOption = question.options.find((o) => o.id === question.correctOptionId);

  // 1. Confidence Insight
  let confidenceInsight = "Not recorded.";
  if (attempt.confidence) {
    if (attempt.isCorrect) {
      if (attempt.confidence === "High") confidenceInsight = "You selected the correct answer with high confidence. This indicates a strong, reliable understanding of the concept.";
      else if (attempt.confidence === "Moderate") confidenceInsight = "You selected the correct answer with moderate confidence. This indicates sound reasoning, but some uncertainty remains.";
      else if (attempt.confidence === "Low") confidenceInsight = "You selected the correct answer with low confidence. While correct, this suggests uncertainty or guessing. Reviewing this concept is recommended.";
    } else {
      if (attempt.confidence === "High") confidenceInsight = "You selected an incorrect answer with high confidence. This may indicate a stronger misconception rather than simple uncertainty.";
      else if (attempt.confidence === "Moderate") confidenceInsight = "You selected an incorrect answer with moderate confidence. The distinction between these options needs review.";
      else if (attempt.confidence === "Low") confidenceInsight = "You selected an incorrect answer with low confidence, indicating uncertainty or incomplete recall.";
    }
  }

  // 2. Probable Error Type
  let probableErrorType: ErrorType | undefined = undefined;
  if (!attempt.isCorrect && attempt.selectedOptionId) {
    if (attempt.confidence === "High") probableErrorType = "Knowledge gap";
    else if (attempt.confidence === "Moderate") probableErrorType = "Confused similar conditions";
    else probableErrorType = "Recall failure";
  } else if (!attempt.selectedOptionId) {
    probableErrorType = "Unanswered";
  } else if (attempt.isCorrect && attempt.confidence === "Low") {
    probableErrorType = "Correct reasoning but uncertain";
  }

  // 3. Option Analyses
  const optionAnalyses = question.options.map((opt) => ({
    optionId: opt.id,
    isCorrect: opt.isCorrect,
    explanation: opt.explanation,
    misconception: opt.misconception,
    whenItCouldBeCorrect: opt.whenItCouldBeCorrect,
  }));

  // 4. Concept Impact
  let conceptImpact: ConceptImpact | undefined = undefined;
  if (conceptAdaptiveDecision) {
    let classification: ConceptImpact["classification"] = "insufficient-evidence";
    let priority: ConceptImpact["reviewPriority"] = "normal";

    const reason = conceptAdaptiveDecision.reasonCode;
    
    if (reason === "repeated-high-confidence-error") {
      classification = "consistent-weakness";
      priority = "high";
    } else if (reason === "high-confidence-error" || reason === "repeated-incorrect") {
      classification = "emerging-weakness";
      priority = "high";
    } else if (reason === "mixed-evidence" || reason === "correct-low-confidence") {
      classification = "possible-weakness";
      priority = "normal";
    } else if (reason === "repeated-correct") {
      classification = "strong";
      priority = "low";
    }

    conceptImpact = {
      classification,
      evidenceSummary: getEvidenceSummary(conceptAdaptiveDecision),
      reviewPriority: priority
    };
  } else {
    if (!attempt.isCorrect) {
      conceptImpact = {
        classification: "possible-weakness",
        evidenceSummary: "This is a recent incorrect response for this concept.",
        reviewPriority: attempt.confidence === "High" ? "high" : "normal"
      };
    } else if (attempt.confidence === "Low") {
      conceptImpact = {
        classification: "possible-weakness",
        evidenceSummary: "Correct response, but marked with low confidence.",
        reviewPriority: "normal"
      };
    }
  }

  return {
    id: generateId(),
    attemptId: attempt.id || generateId(), 
    questionId: question.id,
    questionSetId: question.questionSetId,
    questionVersion: question.questionVersion,
    
    status: attempt.unanswered ? "unanswered" : (attempt.isCorrect ? "correct" : "incorrect"),
    selectedOptionId: attempt.selectedOptionId || undefined,
    correctOptionId: question.correctOptionId,
    
    confidence: attempt.confidence,
    confidenceInsight,
    
    correctAnswerExplanation: question.correctAnswerExplanation,
    selectedAnswerExplanation: selectedOption?.explanation,
    
    optionAnalyses,
    
    decisiveClue: question.decisiveClue,
    reasoningFramework: question.reasoningFramework || question.reasoningSteps,
    probableErrorType,
    
    primaryConceptId: question.primaryConceptId || question.conceptTags?.[0]?.conceptId,
    primaryConceptLabel: question.primaryConceptLabel || question.conceptTags?.[0]?.conceptName,
    secondaryConceptIds: question.secondaryConceptIds,
    
    conceptImpact,
    adaptiveDecisionId: conceptAdaptiveDecision?.id,
    adaptiveRecommendation: conceptAdaptiveDecision ? getAdaptiveRecommendationString(conceptAdaptiveDecision) : undefined,
    difficulty: question.difficulty,
    
    hintsUsed: attempt.hintsUsed,
    timeSpentSeconds: attempt.timeSpentSeconds,
    submissionReason: attempt.submissionReason,
    
    highYieldTakeaway: question.highYieldTakeaway,
    comparisonRule: question.memoryAid,
    
    analysisVersion: 1,
    createdAt: new Date().toISOString()
  };
}

function getEvidenceSummary(decision: AdaptiveDecision): string {
  switch (decision.reasonCode) {
    case "repeated-high-confidence-error": return "Multiple recent incorrect responses, including high-confidence errors.";
    case "high-confidence-error": return "You selected an incorrect answer with high confidence.";
    case "repeated-incorrect": return "Multiple recent incorrect responses for this concept.";
    case "correct-low-confidence": return "You answered correctly, but indicated low confidence.";
    case "correct-with-hints": return "You answered correctly, but relied on hints.";
    case "repeated-correct": return "Multiple independent correct responses for this concept.";
    case "difficulty-ceiling": return "You are consistently answering advanced questions correctly.";
    case "difficulty-floor": return "You are struggling with basic questions for this concept.";
    default: return "Based on your recent responses for this concept.";
  }
}

function getAdaptiveRecommendationString(decision: AdaptiveDecision): string {
  const currentDiff = decision.previousDifficulty;
  const nextDiff = decision.nextDifficulty;
  
  if (decision.decision === "increase") {
    return `The available evidence supports trying an ${nextDiff} question next.`;
  } else if (decision.decision === "decrease") {
    return `A ${nextDiff} question is recommended next to solidify fundamentals.`;
  } else {
    if (decision.purpose === "misconception-correction") {
      return `Maintain ${currentDiff} difficulty and generate misconception-focused review.`;
    }
    return `Maintain ${currentDiff} difficulty for further practice.`;
  }
}
