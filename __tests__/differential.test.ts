import { useCaseStore, isDifferentialBuilderEnabled, getAnalysisRevealStatus, CaseStudy } from "../lib/store";

describe("Differential Builder Store Actions", () => {
  beforeEach(() => {
    useCaseStore.getState().clearAllCases();
  });

  const mockCase: CaseStudy = {
    id: "case-1",
    title: "Test Case",
    content: "Content",
    createdAt: Date.now(),
    analysis: "AI Analysis",
    differentialBuilderEnabled: true,
    analysisRevealStatus: "hidden",
  };

  const mockHistoricalCase: CaseStudy = {
    id: "case-historical",
    title: "Historical",
    content: "Old Content",
    createdAt: Date.now(),
    analysis: "Old Analysis",
  };

  it("should respect historical backward compatibility", () => {
    // Historical case (no differential properties)
    expect(isDifferentialBuilderEnabled(mockHistoricalCase)).toBe(false);
    expect(getAnalysisRevealStatus(mockHistoricalCase)).toBe("revealed");

    // New case
    expect(isDifferentialBuilderEnabled(mockCase)).toBe(true);
    expect(getAnalysisRevealStatus(mockCase)).toBe("hidden");
  });

  it("should save differential draft", () => {
    useCaseStore.getState().addCase(mockCase);

    const draft = {
      entries: [
        { id: "e1", role: "primary" as const, interpretation: "Test Int", supportingFindings: [], opposingFindings: [], reasoningNote: "" }
      ],
      mostInfluentialFinding: "Test Finding",
      influentialFindingReason: "Test Reason",
      updatedAt: "2023-01-01",
    };

    useCaseStore.getState().updateDifferentialDraft("case-1", draft);
    
    const cases = useCaseStore.getState().cases;
    expect(cases[0].differentialDraft).toEqual(draft);
  });

  it("should submit differential and reveal analysis", () => {
    useCaseStore.getState().addCase(mockCase);

    const submission = {
      id: "sub-1",
      entries: [],
      mostInfluentialFinding: "Finding",
      influentialFindingReason: "Reason",
      confidence: "Moderate" as const,
      status: "comparison-pending" as const,
      submittedAt: "2023-01-01",
    };

    useCaseStore.getState().submitDifferential("case-1", submission);

    const updatedCase = useCaseStore.getState().cases[0];
    expect(updatedCase.differentialSubmission).toEqual(submission);
    expect(updatedCase.analysisRevealStatus).toBe("revealed");
    // Draft should be cleared
    expect(updatedCase.differentialDraft).toBeUndefined();
  });

  it("should skip differential and reveal analysis", () => {
    useCaseStore.getState().addCase(mockCase);

    useCaseStore.getState().skipDifferential("case-1");

    const updatedCase = useCaseStore.getState().cases[0];
    expect(updatedCase.differentialSubmission?.status).toBe("skipped");
    expect(updatedCase.analysisRevealStatus).toBe("revealed");
  });

  it("should save differential comparison", () => {
    useCaseStore.getState().addCase(mockCase);
    useCaseStore.getState().submitDifferential("case-1", {
      id: "sub-1",
      entries: [],
      mostInfluentialFinding: "Finding",
      influentialFindingReason: "Reason",
      confidence: "Moderate" as const,
      status: "comparison-pending" as const,
      submittedAt: "2023-01-01",
    });

    const comparison = {
      overlapSummary: "Overlap",
      alignedReasoning: [],
      missingConsiderations: [],
      unsupportedAssumptions: [],
      evidenceUseAnalysis: [],
      learningPriorities: [],
    };

    useCaseStore.getState().saveDifferentialComparison("case-1", comparison);

    const updatedCase = useCaseStore.getState().cases[0];
    expect(updatedCase.differentialSubmission?.status).toBe("comparison-complete");
    expect(updatedCase.differentialSubmission?.comparison).toEqual(comparison);
  });

  it("should mark differential comparison as failed", () => {
    useCaseStore.getState().addCase(mockCase);
    useCaseStore.getState().submitDifferential("case-1", {
      id: "sub-1",
      entries: [],
      mostInfluentialFinding: "Finding",
      influentialFindingReason: "Reason",
      confidence: "Moderate" as const,
      status: "comparison-pending" as const,
      submittedAt: "2023-01-01",
    });

    useCaseStore.getState().markDifferentialComparisonFailed("case-1");

    const updatedCase = useCaseStore.getState().cases[0];
    expect(updatedCase.differentialSubmission?.status).toBe("comparison-failed");
  });
});
