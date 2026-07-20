import { useCaseStore } from '../lib/store';

jest.mock('../lib/ai', () => ({
  hashCurrentNarrative: (text: string) => "mock-hash",
  analyzeCaseStudy: jest.fn(),
  generateMCQs: jest.fn(),
  analyzePerformance: jest.fn(),
  generateStudyMaterial: jest.fn(),
  generateProgressiveCase: jest.fn(),
}));

describe('Progressive Case Reveal Store Actions', () => {
  beforeEach(() => {
    // Reset store before each test
    useCaseStore.setState({ cases: [] });
  });

  const mockCaseId = "case-123";
  const mockNarrative = "A 45-year-old man presents with chest pain.";
  
  const setupProgressiveCase = () => {
    useCaseStore.getState().addCase({
      id: mockCaseId,
      title: "Test Case",
      content: mockNarrative,
      caseFormat: "progressive",
      analysisRevealStatus: "hidden",
      progressiveGenerationStatus: "ready",
      progressiveCase: {
        version: 1,
        sourceNarrativeHash: "mock-hash",
        generatedAt: new Date().toISOString(),
        stages: [
          {
            id: "stage-1", order: 1, type: "presentation", title: "Presentation", content: "Chest pain",
            sourceEvidence: [{ quote: "chest pain" }]
          },
          {
            id: "stage-2", order: 2, type: "history", title: "History", content: "45-year-old",
            sourceEvidence: [{ quote: "45-year-old" }]
          }
        ]
      }
    } as any);
  };

  it('Current draft is cleared after submission and stage advances', () => {
    setupProgressiveCase();
    useCaseStore.getState().initProgressiveSession(mockCaseId);
    
    // Set a draft
    useCaseStore.getState().updateProgressiveDraft(mockCaseId, {
      stageId: "stage-1",
      leadingInterpretation: "ACS",
      requestedInformation: "ECG",
      mostImportantClue: "chest pain",
      updatedAt: new Date().toISOString()
    });

    const stateWithDraft = useCaseStore.getState().cases[0];
    expect(stateWithDraft.progressiveDraft).toBeDefined();

    // Submit stage
    useCaseStore.getState().submitProgressiveStage(mockCaseId, {
      id: "resp-1",
      stageId: "stage-1",
      stageOrder: 1,
      leadingInterpretation: "ACS",
      requestedInformation: "ECG",
      mostImportantClue: "chest pain",
      differentialChanged: "initial",
      confidence: "Moderate",
      submittedAt: new Date().toISOString()
    });

    const finalState = useCaseStore.getState().cases[0];
    // Draft cleared
    expect(finalState.progressiveDraft).toBeUndefined();
    // Index advanced
    expect(finalState.progressiveSession?.currentStageIndex).toBe(1);
    // Response added
    expect(finalState.progressiveSession?.stageResponses.length).toBe(1);
  });

  it('Submitted stage cannot be edited/resubmitted', () => {
    setupProgressiveCase();
    useCaseStore.getState().initProgressiveSession(mockCaseId);
    
    const response = {
      id: "resp-1",
      stageId: "stage-1",
      stageOrder: 1,
      leadingInterpretation: "ACS",
      requestedInformation: "ECG",
      mostImportantClue: "chest pain",
      differentialChanged: "initial" as const,
      confidence: "Moderate" as const,
      submittedAt: new Date().toISOString()
    };

    useCaseStore.getState().submitProgressiveStage(mockCaseId, response);
    
    // Attempt duplicate submission
    useCaseStore.getState().submitProgressiveStage(mockCaseId, response);
    
    const state = useCaseStore.getState().cases[0];
    // Should still only have 1 response (the duplicate was blocked by store check)
    expect(state.progressiveSession?.stageResponses.length).toBe(1);
  });

  it('Skip marks session as skipped but not completed, and reveals analysis', () => {
    setupProgressiveCase();
    useCaseStore.getState().initProgressiveSession(mockCaseId);
    
    useCaseStore.getState().skipProgressiveReview(mockCaseId);
    
    const state = useCaseStore.getState().cases[0];
    expect(state.progressiveSession?.status).toBe("skipped");
    expect(state.progressiveSession?.status).not.toBe("completed");
    expect(state.analysisRevealStatus).toBe("revealed");
  });

  it('Completion marks session as completed', () => {
    setupProgressiveCase();
    useCaseStore.getState().initProgressiveSession(mockCaseId);
    
    useCaseStore.getState().completeProgressiveReview(mockCaseId);
    
    const state = useCaseStore.getState().cases[0];
    expect(state.progressiveSession?.status).toBe("completed");
  });
  
  it('Complete Case workflow remains unchanged', () => {
    useCaseStore.getState().addCase({
      id: "case-complete",
      caseFormat: "complete",
      analysisRevealStatus: "hidden",
    } as any);

    const state = useCaseStore.getState().cases[0];
    expect(state.caseFormat).toBe("complete");
    expect(state.progressiveSession).toBeUndefined();
  });
});
