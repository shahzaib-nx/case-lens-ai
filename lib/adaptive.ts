import {
  DifficultyLevel,
  AdaptiveDecisionType,
  AdaptiveQuestionPurpose,
  AdaptiveReasonCode,
  AdaptiveDecision,
  QuestionAttempt,
  McqQuestion
} from "./store";

export type AdaptiveEvidence = {
  attemptId: string;
  questionId: string;
  conceptId: string;
  difficulty: DifficultyLevel;
  isCorrect: boolean;
  confidence?: "Low" | "Moderate" | "High";
  hintsUsed?: number;
  unanswered?: boolean;
  submittedAt: string;
};

export type AdaptiveDecisionInput = {
  currentDifficulty: DifficultyLevel;
  conceptId: string;
  recentEvidence: AdaptiveEvidence[];
};

export type AdaptiveDecisionResult = {
  nextDifficulty: DifficultyLevel;
  decision: AdaptiveDecisionType;
  purpose: AdaptiveQuestionPurpose;
  reasonCode: AdaptiveReasonCode;
};

export function createAdaptiveDecisionKey(
  conceptId: string,
  difficulty: DifficultyLevel,
  attemptIds: string[]
): string {
  return [conceptId, difficulty, ...[...attemptIds].sort()].join(":");
}

export function extractEligibleAdaptiveEvidence(
  attempts: QuestionAttempt[],
  mcqs: McqQuestion[],
  targetConceptId: string
): AdaptiveEvidence[] {
  const evidence: AdaptiveEvidence[] = [];

  for (const attempt of attempts) {
    if (attempt.unanswered && attempt.submissionReason !== "manual") {
      continue; // Skip timed-out unanswered attempts
    }

    const question = mcqs.find((q) => q.id === attempt.questionId);
    if (!question) continue;

    const primaryConcept = question.conceptTags?.[0]?.conceptId;
    if (!primaryConcept || primaryConcept !== targetConceptId) continue;

    evidence.push({
      attemptId: `${attempt.questionId}-${attempt.attemptNumber}`, // Unique ID if no UUID exists
      questionId: attempt.questionId,
      conceptId: primaryConcept,
      difficulty: question.difficulty || "Intermediate",
      isCorrect: attempt.isCorrect,
      confidence: attempt.confidence,
      hintsUsed: attempt.hintsUsed,
      unanswered: attempt.unanswered,
      submittedAt: attempt.answeredAt,
    });
  }

  return evidence;
}

export function decideNextDifficulty({
  currentDifficulty,
  conceptId,
  recentEvidence,
}: AdaptiveDecisionInput): AdaptiveDecisionResult {
  // Use most recent 5 eligible completed attempts
  const relevant = recentEvidence
    .filter((item) => !item.unanswered)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .slice(-5);

  if (relevant.length < 2) {
    return {
      nextDifficulty: currentDifficulty,
      decision: "maintain",
      purpose: "standard",
      reasonCode: "insufficient-evidence",
    };
  }

  const lastTwo = relevant.slice(-2);
  const bothCorrect = lastTwo.every((item) => item.isCorrect);
  const bothIncorrect = lastTwo.every((item) => !item.isCorrect);
  const bothHighConfidenceError = lastTwo.every((item) => !item.isCorrect && item.confidence === "High");

  const singleHighConfidenceError = relevant
    .slice(-1)
    .some((item) => !item.isCorrect && item.confidence === "High");

  const correctLowConfidence = relevant
    .slice(-1)
    .some((item) => item.isCorrect && item.confidence === "Low");

  const correctWithHints = relevant
    .slice(-1)
    .some((item) => item.isCorrect && (item.hintsUsed ?? 0) > 0);

  // Priority 1: Repeated high-confidence errors
  if (bothHighConfidenceError) {
    return {
      nextDifficulty:
        currentDifficulty === "Advanced"
          ? "Intermediate"
          : currentDifficulty === "Intermediate"
          ? "Basic"
          : "Basic",
      decision: currentDifficulty === "Basic" ? "maintain" : "decrease",
      purpose: "misconception-correction",
      reasonCode: "repeated-high-confidence-error",
    };
  }

  // Priority 2: Repeated incorrect responses
  if (bothIncorrect) {
    return {
      nextDifficulty:
        currentDifficulty === "Advanced"
          ? "Intermediate"
          : currentDifficulty === "Intermediate"
          ? "Basic"
          : "Basic",
      decision: currentDifficulty === "Basic" ? "maintain" : "decrease",
      purpose: "reinforcement",
      reasonCode: currentDifficulty === "Basic" ? "difficulty-floor" : "repeated-incorrect",
    };
  }

  // Priority 3: Single high-confidence error
  if (singleHighConfidenceError) {
    if (currentDifficulty === "Advanced") {
      return {
        nextDifficulty: "Intermediate",
        decision: "decrease",
        purpose: "misconception-correction",
        reasonCode: "high-confidence-error",
      };
    }
    return {
      nextDifficulty: currentDifficulty,
      decision: "maintain",
      purpose: "misconception-correction",
      reasonCode: "high-confidence-error",
    };
  }

  // Priority 4: Correct response with low confidence
  if (correctLowConfidence) {
    return {
      nextDifficulty: currentDifficulty,
      decision: "maintain",
      purpose: "confidence-reinforcement",
      reasonCode: "correct-low-confidence",
    };
  }

  // Priority 5: Correct response using hints
  if (correctWithHints) {
    return {
      nextDifficulty: currentDifficulty,
      decision: "maintain",
      purpose: "reinforcement",
      reasonCode: "correct-with-hints",
    };
  }

  // Priority 6: Repeated correct responses
  if (bothCorrect) {
    return {
      nextDifficulty:
        currentDifficulty === "Basic"
          ? "Intermediate"
          : currentDifficulty === "Intermediate"
          ? "Advanced"
          : "Advanced",
      decision: currentDifficulty === "Advanced" ? "maintain" : "increase",
      purpose: currentDifficulty === "Advanced" ? "advanced-integration" : "standard",
      reasonCode: currentDifficulty === "Advanced" ? "difficulty-ceiling" : "repeated-correct",
    };
  }

  // Priority 7: Mixed evidence
  return {
    nextDifficulty: currentDifficulty,
    decision: "maintain",
    purpose: "standard",
    reasonCode: "mixed-evidence",
  };
}

export function getAdaptiveDecisionExplanation(decision: Pick<AdaptiveDecision, "reasonCode" | "nextDifficulty">): string {
  switch (decision.reasonCode) {
    case "repeated-correct":
      return "Two recent correct responses support trying the next difficulty.";
    case "repeated-incorrect":
      return "Repeated errors suggest reinforcing the concept at a more foundational level.";
    case "repeated-high-confidence-error":
      return "Repeated high-confidence errors indicate a stable misconception. The next review will focus on correcting that distinction.";
    case "high-confidence-error":
      return "A high-confidence error may indicate a stable misconception, so the next review will focus on correcting that distinction.";
    case "correct-low-confidence":
      return "The answer was correct, but low confidence suggests that further reinforcement may improve reliable recall.";
    case "correct-with-hints":
      return "The answer was correct with support, so the current difficulty will be maintained for further independent practice.";
    case "difficulty-ceiling":
      return "Strong performance is continuing at the highest available difficulty.";
    case "difficulty-floor":
      return "The next review will remain at Basic difficulty and reinforce the underlying foundation.";
    case "mixed-evidence":
      return "Recent responses are mixed, so the current difficulty will be maintained.";
    case "insufficient-evidence":
    default:
      return "More completed responses are needed before adjusting difficulty.";
  }
}
