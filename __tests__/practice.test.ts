import { useCaseStore, PracticeMode, TimerMode, getPracticeSessions } from "../lib/store";

describe("Practice Mode and Session Management", () => {
  beforeEach(() => {
    useCaseStore.setState({ cases: [] });
  });

  it("treats legacy cases without sessions as Learning Mode", () => {
    const { addCase } = useCaseStore.getState();
    addCase({
      id: "legacy-1",
      title: "Legacy Case",
      content: "Content",
      questions: [
        {
          id: "q1",
          text: "What is 2+2?",
          options: [
            { id: "opt1", text: "4", isCorrect: true },
            { id: "opt2", text: "5", isCorrect: false },
          ]
        }
      ],
      answers: { "q1": "opt1" },
      attempts: [
        { questionId: "q1", selectedOptionId: "opt1", confidence: "High", submittedAt: new Date().toISOString() }
      ],
      score: 1,
    });

    const state = useCaseStore.getState();
    const legacyCase = state.cases.find(c => c.id === "legacy-1");
    expect(legacyCase).toBeDefined();

    const sessions = getPracticeSessions(legacyCase!);
    expect(sessions.length).toBe(1);
    
    const session = sessions[0];
    expect(session.mode).toBe("learning");
    expect(session.timerConfig.mode).toBe("none");
    expect(session.status).toBe("completed");
    expect(session.attempts.length).toBe(1);
  });

  it("creates an exam mode session correctly", () => {
    const { addCase, createPracticeSession } = useCaseStore.getState();
    addCase({
      id: "exam-case-1",
      title: "Exam Case",
      content: "Content",
      questions: [
        {
          id: "q1",
          text: "Question 1",
          options: [{ id: "opt1", text: "A", isCorrect: true }]
        }
      ]
    });

    const sessionId = createPracticeSession("exam-case-1", "exam", { mode: "total", totalDurationSeconds: 60 });
    expect(sessionId).toBeDefined();

    const state = useCaseStore.getState();
    const testCase = state.cases.find(c => c.id === "exam-case-1");
    const sessions = getPracticeSessions(testCase!);
    expect(sessions.length).toBe(1);

    const session = sessions[0];
    expect(session.mode).toBe("exam");
    expect(session.timerConfig.mode).toBe("total");
    expect(session.status).toBe("not-started");
  });

  it("handles start, submit, and complete session flow", () => {
    const { addCase, createPracticeSession, startPracticeSession, submitPracticeAttempt, completePracticeSession } = useCaseStore.getState();
    
    addCase({
      id: "flow-case",
      title: "Flow Case",
      content: "Content",
      questions: [
        {
          id: "q1",
          text: "Question 1",
          options: [{ id: "opt1", text: "A", isCorrect: true }]
        }
      ]
    });

    const sessionId = createPracticeSession("flow-case", "learning", { mode: "none" });
    startPracticeSession("flow-case", sessionId);

    let state = useCaseStore.getState();
    let session = getPracticeSessions(state.cases.find(c => c.id === "flow-case")!)[0];
    expect(session.status).toBe("in-progress");
    expect(session.startedAt).toBeDefined();

    submitPracticeAttempt("flow-case", sessionId, {
      questionId: "q1",
      selectedOptionId: "opt1",
      confidence: "High",
      submittedAt: new Date().toISOString()
    });

    state = useCaseStore.getState();
    session = getPracticeSessions(state.cases.find(c => c.id === "flow-case")!)[0];
    expect(session.attempts.length).toBe(1);

    completePracticeSession("flow-case", sessionId, "manual-completion");

    state = useCaseStore.getState();
    session = getPracticeSessions(state.cases.find(c => c.id === "flow-case")!)[0];
    expect(session.status).toBe("completed");
    expect(session.completedAt).toBeDefined();
  });

  it("preserves old sessions when starting a retake", () => {
    const { addCase, createPracticeSession, startPracticeSession, completePracticeSession } = useCaseStore.getState();
    
    addCase({
      id: "retake-case",
      title: "Retake Case",
      content: "Content",
      questions: []
    });

    // Session 1
    const s1 = createPracticeSession("retake-case", "learning", { mode: "none" });
    startPracticeSession("retake-case", s1);
    completePracticeSession("retake-case", s1, "manual-completion");

    // Session 2 (Retake)
    const s2 = createPracticeSession("retake-case", "exam", { mode: "per-question", secondsPerQuestion: 30 });
    
    const state = useCaseStore.getState();
    const sessions = getPracticeSessions(state.cases.find(c => c.id === "retake-case")!);
    
    expect(sessions.length).toBe(2);
    expect(sessions[0].id).toBe(s1);
    expect(sessions[0].mode).toBe("learning");
    expect(sessions[0].status).toBe("completed");
    
    expect(sessions[1].id).toBe(s2);
    expect(sessions[1].mode).toBe("exam");
    expect(sessions[1].status).toBe("not-started");
  });
});
