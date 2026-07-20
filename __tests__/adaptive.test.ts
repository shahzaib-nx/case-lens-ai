import {
  decideNextDifficulty,
  extractEligibleAdaptiveEvidence,
  createAdaptiveDecisionKey,
  AdaptiveEvidence
} from "../lib/adaptive";
import { QuestionAttempt, McqQuestion } from "../lib/store";

describe("Adaptive Decision Engine", () => {
  const baseAttempt: QuestionAttempt = {
    questionId: "q1",
    selectedOptionId: "opt1",
    isCorrect: false,
    answeredAt: new Date().toISOString(),
    attemptNumber: 1,
    practiceMode: "learning",
    submissionReason: "manual",
    unanswered: false,
    hintsUsed: 0,
    timeSpentSeconds: 10,
  };

  const createEvidence = (
    overrides: Partial<AdaptiveEvidence>
  ): AdaptiveEvidence => ({
    attemptId: "att-1",
    questionId: "q1",
    conceptId: "c1",
    difficulty: "Intermediate",
    isCorrect: true,
    submittedAt: new Date().toISOString(),
    ...overrides,
  });

  describe("decideNextDifficulty Rules", () => {
    it("1. Returns insufficient-evidence if less than 2 eligible attempts", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [createEvidence({ isCorrect: true })],
      });
      expect(result.reasonCode).toBe("insufficient-evidence");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.decision).toBe("maintain");
    });

    it("2. Repeated High-Confidence errors decrease difficulty (Adv -> Int)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Advanced",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false, confidence: "High" }),
          createEvidence({ isCorrect: false, confidence: "High" }),
        ],
      });
      expect(result.reasonCode).toBe("repeated-high-confidence-error");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.purpose).toBe("misconception-correction");
    });

    it("3. Repeated High-Confidence errors decrease difficulty (Int -> Basic)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false, confidence: "High" }),
          createEvidence({ isCorrect: false, confidence: "High" }),
        ],
      });
      expect(result.nextDifficulty).toBe("Basic");
      expect(result.decision).toBe("decrease");
    });

    it("4. Single High-Confidence error at Advanced decreases to Intermediate", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Advanced",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true, confidence: "High" }),
          createEvidence({ isCorrect: false, confidence: "High" }),
        ],
      });
      expect(result.reasonCode).toBe("high-confidence-error");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.decision).toBe("decrease");
    });

    it("5. Single High-Confidence error at Intermediate maintains difficulty but changes purpose", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true, confidence: "High" }),
          createEvidence({ isCorrect: false, confidence: "High" }),
        ],
      });
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.decision).toBe("maintain");
      expect(result.purpose).toBe("misconception-correction");
    });

    it("6. Repeated incorrect decreases difficulty (Int -> Basic)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false, confidence: "Moderate" }),
          createEvidence({ isCorrect: false, confidence: "Low" }),
        ],
      });
      expect(result.reasonCode).toBe("repeated-incorrect");
      expect(result.nextDifficulty).toBe("Basic");
      expect(result.decision).toBe("decrease");
      expect(result.purpose).toBe("reinforcement");
    });

    it("7. Repeated correct increases difficulty (Basic -> Int)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Basic",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true, confidence: "Moderate" }),
          createEvidence({ isCorrect: true, confidence: "High" }),
        ],
      });
      expect(result.reasonCode).toBe("repeated-correct");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.decision).toBe("increase");
    });

    it("8. Repeated correct increases difficulty (Int -> Adv)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true }),
          createEvidence({ isCorrect: true }),
        ],
      });
      expect(result.nextDifficulty).toBe("Advanced");
    });

    it("9. Repeated correct at Advanced stays at Advanced (Ceiling)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Advanced",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true }),
          createEvidence({ isCorrect: true }),
        ],
      });
      expect(result.reasonCode).toBe("difficulty-ceiling");
      expect(result.nextDifficulty).toBe("Advanced");
      expect(result.decision).toBe("maintain");
      expect(result.purpose).toBe("advanced-integration");
    });

    it("10. Repeated incorrect at Basic stays at Basic (Floor)", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Basic",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false }),
          createEvidence({ isCorrect: false }),
        ],
      });
      expect(result.reasonCode).toBe("difficulty-floor");
      expect(result.nextDifficulty).toBe("Basic");
      expect(result.decision).toBe("maintain");
    });

    it("11. Correct with Low Confidence maintains difficulty and reinforces", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false }),
          createEvidence({ isCorrect: true, confidence: "Low" }),
        ],
      });
      expect(result.reasonCode).toBe("correct-low-confidence");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.purpose).toBe("confidence-reinforcement");
    });

    it("12. Correct with Hints maintains difficulty and reinforces", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false }),
          createEvidence({ isCorrect: true, hintsUsed: 1 }),
        ],
      });
      expect(result.reasonCode).toBe("correct-with-hints");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.purpose).toBe("reinforcement");
    });

    it("13. Mixed evidence maintains difficulty", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Intermediate",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: true }),
          createEvidence({ isCorrect: false, confidence: "Moderate" }),
        ],
      });
      expect(result.reasonCode).toBe("mixed-evidence");
      expect(result.nextDifficulty).toBe("Intermediate");
      expect(result.decision).toBe("maintain");
    });

    it("14. Only looks at 5 most recent attempts, prioritizing the final 2", () => {
      const result = decideNextDifficulty({
        currentDifficulty: "Basic",
        conceptId: "c1",
        recentEvidence: [
          createEvidence({ isCorrect: false, submittedAt: "2026-07-20T10:00:01" }),
          createEvidence({ isCorrect: false, submittedAt: "2026-07-20T10:00:02" }),
          createEvidence({ isCorrect: false, submittedAt: "2026-07-20T10:00:03" }),
          createEvidence({ isCorrect: false, submittedAt: "2026-07-20T10:00:04" }),
          createEvidence({ isCorrect: true, submittedAt: "2026-07-20T10:00:05" }),
          createEvidence({ isCorrect: true, submittedAt: "2026-07-20T10:00:06" }),
        ],
      });
      expect(result.reasonCode).toBe("repeated-correct");
      expect(result.nextDifficulty).toBe("Intermediate");
    });
  });

  describe("extractEligibleAdaptiveEvidence", () => {
    const mcqs: McqQuestion[] = [
      {
        id: "q1",
        stem: "Stem",
        options: [],
        correctAnswerExplanation: "",
        caseEvidence: [],
        reasoningSteps: [],
        highYieldTakeaway: "",
        conceptTags: [{ conceptId: "c1", conceptName: "C1", subject: "S", topic: "T" }],
        difficulty: "Intermediate",
        examStyle: "General",
      },
      {
        id: "q2",
        stem: "Stem 2",
        options: [],
        correctAnswerExplanation: "",
        caseEvidence: [],
        reasoningSteps: [],
        highYieldTakeaway: "",
        conceptTags: [{ conceptId: "c2", conceptName: "C2", subject: "S", topic: "T" }],
        difficulty: "Intermediate",
        examStyle: "General",
      },
    ];

    it("15. Excludes timed-out unanswered attempts", () => {
      const attempts: QuestionAttempt[] = [
        { ...baseAttempt, questionId: "q1", unanswered: true, submissionReason: "question-time-expired" }
      ];
      const evidence = extractEligibleAdaptiveEvidence(attempts, mcqs, "c1");
      expect(evidence.length).toBe(0);
    });

    it("16. Includes manual unanswered attempts", () => {
      const attempts: QuestionAttempt[] = [
        { ...baseAttempt, questionId: "q1", unanswered: true, submissionReason: "manual" }
      ];
      const evidence = extractEligibleAdaptiveEvidence(attempts, mcqs, "c1");
      expect(evidence.length).toBe(1);
    });

    it("17. Excludes attempts without canonical concept IDs", () => {
      const mcqsNoConcept: McqQuestion[] = [{ ...mcqs[0], conceptTags: [] }];
      const attempts: QuestionAttempt[] = [{ ...baseAttempt, questionId: "q1" }];
      const evidence = extractEligibleAdaptiveEvidence(attempts, mcqsNoConcept, "c1");
      expect(evidence.length).toBe(0);
    });

    it("18. Filters correctly by targetConceptId", () => {
      const attempts: QuestionAttempt[] = [
        { ...baseAttempt, questionId: "q1" },
        { ...baseAttempt, questionId: "q2" }
      ];
      const evidence = extractEligibleAdaptiveEvidence(attempts, mcqs, "c1");
      expect(evidence.length).toBe(1);
      expect(evidence[0].questionId).toBe("q1");
    });
  });

  describe("createAdaptiveDecisionKey", () => {
    it("19. Generates stable keys regardless of attempt ID order", () => {
      const key1 = createAdaptiveDecisionKey("c1", "Basic", ["att2", "att1"]);
      const key2 = createAdaptiveDecisionKey("c1", "Basic", ["att1", "att2"]);
      expect(key1).toBe(key2);
      expect(key1).toBe("c1:Basic:att1:att2");
    });
  });
});
