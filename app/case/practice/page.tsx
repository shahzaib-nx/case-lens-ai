"use client";

import { useCaseStore, McqQuestion, getPracticeSessions, PracticeSessionStatus, PracticeCompletionReason, PracticeMode, QuestionAttempt, QuestionReviewAnalysis } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { ConfidenceLevel, getConfidenceInsight } from "@/lib/confidenceUtils";
import { QuestionReviewCard } from "@/components/QuestionReviewCard";
import { buildQuestionReviewAnalysis } from "@/lib/reviewBuilder";
import { useToast } from "@/components/ToastProvider";

export function getRemainingSeconds(expiresAt?: string, now: number = Date.now()): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) return null;
  return Math.max(0, Math.ceil((expiry - now) / 1000));
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id") || "";
  const router = useRouter();
  const { cases, createPracticeSession, startPracticeSession, submitPracticeAttempt, completePracticeSession, updatePracticeDraft, advancePracticeQuestion } = useCaseStore();
  const [mounted, setMounted] = useState(false);
  
  const currentCase = cases.find((c) => c.id === caseId);
  const { confirm } = useConfirm();

  // Local state for UI only
  const [now, setNow] = useState(Date.now());
  const [showAllOptions, setShowAllOptions] = useState(false);
  const { toast } = useToast();
  const [confidenceError, setConfidenceError] = useState("");
  const expiryHandledRef = useRef<{ qIdx: number, sessionId: string } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Session Orchestration
  const allSessions = currentCase ? getPracticeSessions(currentCase) : [];
  
  const activeSession = useMemo(() => {
    if (!currentCase) return undefined;
    const targetMode = currentCase.practiceMode || "learning";
    const targetTimer = currentCase.timerConfig || { mode: "none" };

    // Find a compatible session
    return allSessions.find(s => 
      (s.status === "not-started" || s.status === "in-progress") &&
      s.mode === targetMode &&
      JSON.stringify(s.timerConfig) === JSON.stringify(targetTimer)
    );
  }, [allSessions, currentCase]);

  // Auto-create session if missing
  useEffect(() => {
    if (mounted && currentCase && !activeSession) {
      // Create a compatible session using the case's settings defaults
      const targetMode = currentCase.practiceMode || "learning";
      const targetTimer = currentCase.timerConfig || { mode: "none" };
      createPracticeSession(currentCase.id, targetMode, targetTimer);
    }
  }, [mounted, currentCase, activeSession, createPracticeSession]);

  const questions = useMemo(() => {
    if (!currentCase) return [];
    return currentCase.mcqs || currentCase.questions || [];
  }, [currentCase]);

  // Derived state
  const isStarted = activeSession?.status === "in-progress";
  const isCompleted = activeSession?.status === "completed" || activeSession?.status === "expired";
  const currentIndex = activeSession?.currentQuestionIndex || 0;
  
  const currentQuestionRaw = questions[currentIndex] as McqQuestion | undefined;
  
  // Stable shuffled options for this question
  const shuffledOptions = useMemo(() => {
    if (!currentQuestionRaw?.options) return [];
    return [...currentQuestionRaw.options]
      .map((opt, idx) => ({ ...opt, label: String.fromCharCode(65 + idx) }));
  }, [currentQuestionRaw?.id]);

  const currentQuestion = currentQuestionRaw ? { ...currentQuestionRaw, options: shuffledOptions } : undefined;
  
  const draft = activeSession?.currentDraft;
  const selectedOption = draft?.selectedOptionId || null;
  const confidence = draft?.confidence || null;

  const existingAttempt = activeSession?.attempts.find(a => a.questionId === currentQuestion?.id);
  const isSubmitted = !!existingAttempt;

  const mayRevealFeedback = activeSession?.mode === "learning" || isCompleted;

  // 2. Timer Expiry Handling
  useEffect(() => {
    if (!mounted || !isStarted || !activeSession || !currentQuestionRaw || isSubmitted || isCompleted) return;

    const remainingTotal = getRemainingSeconds(activeSession.expiresAt, now);
    const remainingQ = getRemainingSeconds(activeSession.currentQuestionExpiresAt, now);

    const handleExpiry = (reason: PracticeCompletionReason | "question-time-expired") => {
      // Guard against double execution
      if (expiryHandledRef.current?.qIdx === currentIndex && expiryHandledRef.current?.sessionId === activeSession.id) return;
      expiryHandledRef.current = { qIdx: currentIndex, sessionId: activeSession.id };

      const timeSpent = activeSession.currentQuestionStartedAt ? Math.round((Date.now() - new Date(activeSession.currentQuestionStartedAt).getTime()) / 1000) : 0;
      
      const isCorrectValue = selectedOption ? (selectedOption === currentQuestionRaw.correctOptionId || !!currentQuestionRaw.options?.find(o => o.id === selectedOption)?.isCorrect) : false;

      const safeQuestionId = currentQuestionRaw.id || `q-${currentIndex}`;
      
      const attempt: QuestionAttempt = {
        questionId: safeQuestionId,
        selectedOptionId: selectedOption,
        isCorrect: isCorrectValue,
        answeredAt: new Date().toISOString(),
        attemptNumber: (currentCase?.attempts?.filter(a => a.questionId === safeQuestionId)?.length || 0) + 1,
        confidence: confidence || undefined,
        practiceMode: activeSession.mode,
        submissionReason: reason === "total-time-expired" ? "total-time-expired" : "question-time-expired",
        unanswered: !selectedOption,
        hintsUsed: 0,
        timeSpentSeconds: timeSpent
      };

      submitPracticeAttempt(currentCase!.id, activeSession.id, attempt);

      if (reason === "total-time-expired") {
        completePracticeSession(currentCase!.id, activeSession.id, "total-time-expired");
        router.push(`/case/results?id=${currentCase!.id}`);
      } else {
        advancePracticeQuestion(currentCase!.id, activeSession.id);
        setShowAllOptions(false);
      }
    };

    if (remainingTotal !== null && remainingTotal <= 0) {
      handleExpiry("total-time-expired");
    } else if (remainingQ !== null && remainingQ <= 0) {
      handleExpiry("question-time-expired");
    }
  }, [mounted, isStarted, activeSession, currentQuestionRaw, isSubmitted, isCompleted, now, selectedOption, confidence, currentIndex, currentCase, submitPracticeAttempt, completePracticeSession, router]);
  // Auto-forward if questions exhausted
  useEffect(() => {
    if (mounted && activeSession && currentCase && currentIndex >= questions.length && activeSession.status === "in-progress") {
      completePracticeSession(currentCase.id, activeSession.id, "all-questions-completed");
      router.push(`/case/results?id=${currentCase.id}&sessionId=${activeSession.id}`);
    }
  }, [mounted, activeSession, currentCase, currentIndex, questions.length, completePracticeSession, router]);

  if (!mounted) return null;

  if (!currentCase || questions.length === 0 || !activeSession) {
    return (
      <div className="max-w-xl mx-auto glass-card text-center mt-12">
        <h2 className="text-[var(--error)] mb-4">Quiz Unavailable</h2>
        <p className="mb-8">No questions generated or session missing.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary">Go Home</button>
      </div>
    );
  }



  if (currentIndex >= questions.length && activeSession?.status === "in-progress") {
    return null;
  }

  // 3. Start Confirmation Screen
  if (activeSession.status === "not-started") {
    return (
      <div className="max-w-xl mx-auto glass-card text-center mt-12">
        <h2 className="mb-4">Start {activeSession.mode === "exam" ? "Exam Mode" : "Learning Mode"}?</h2>
        <div className="text-left mb-8 bg-gray-50 p-6 rounded text-sm space-y-4">
          <p><strong>Questions:</strong> {questions.length}</p>
          <p><strong>Mode:</strong> {activeSession.mode === "exam" ? "Exam Mode (Delayed Feedback)" : "Learning Mode (Immediate Feedback)"}</p>
          <p><strong>Timer:</strong> {
            activeSession.timerConfig.mode === "none" ? "No timer" :
            activeSession.timerConfig.mode === "total" ? `${activeSession.timerConfig.totalDurationSeconds! / 60} minutes total` :
            `${activeSession.timerConfig.secondsPerQuestion} seconds per question`
          }</p>
          {activeSession.mode === "exam" && (
            <p className="text-gray-600 mt-4 italic">
              Answers and explanations will remain hidden until the question set is completed. Submitted answers cannot be changed.
            </p>
          )}
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => router.push(`/new-case`)} className="btn btn-secondary">Back to Settings</button>
          <button onClick={() => startPracticeSession(currentCase.id, activeSession.id)} className="btn btn-primary">Start {activeSession.mode === "exam" ? "Exam" : "Practice"}</button>
        </div>
      </div>
    );
  }

  if (!currentQuestionRaw || !currentQuestion) {
    return null; // Safety
  }

  // Event Handlers
  const handleSelect = (id: string) => {
    if (isSubmitted || isCompleted) return;
    updatePracticeDraft(currentCase.id, activeSession.id, {
      questionId: currentQuestionRaw.id,
      selectedOptionId: id,
      confidence: draft?.confidence,
      updatedAt: new Date().toISOString()
    });
    setConfidenceError("");
  };

  const handleConfidenceChange = (val: ConfidenceLevel) => {
    if (isSubmitted || isCompleted) return;
    updatePracticeDraft(currentCase.id, activeSession.id, {
      questionId: currentQuestionRaw.id,
      selectedOptionId: draft?.selectedOptionId,
      confidence: val,
      updatedAt: new Date().toISOString()
    });
    setConfidenceError("");
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;
    
    if (!confidence) {
      setConfidenceError("Select your confidence level before submitting.");
      toast("Select your confidence level before submitting.", "error");
      return;
    }
    setConfidenceError("");
    
    try {
      const timeSpent = activeSession.currentQuestionStartedAt ? Math.round((Date.now() - new Date(activeSession.currentQuestionStartedAt).getTime()) / 1000) : 0;
      const isCorrectValue = selectedOption === currentQuestionRaw.correctOptionId || 
                             !!currentQuestionRaw.options?.find(o => o.id === selectedOption)?.isCorrect;
                             
      const safeQuestionId = currentQuestionRaw.id || `q-${currentIndex}`;
      
      const attempt: QuestionAttempt = {
        questionId: safeQuestionId,
        selectedOptionId: selectedOption,
        isCorrect: isCorrectValue,
        answeredAt: new Date().toISOString(),
        attemptNumber: (currentCase.attempts?.filter(a => a.questionId === safeQuestionId)?.length || 0) + 1,
        confidence: confidence,
        practiceMode: activeSession.mode,
        submissionReason: "manual",
        unanswered: false,
        hintsUsed: 0,
        timeSpentSeconds: timeSpent
      };

      submitPracticeAttempt(currentCase.id, activeSession.id, attempt);
      setShowAllOptions(false);
      
      if (activeSession.mode === "exam") {
        toast("Response submitted", "success");
        advancePracticeQuestion(currentCase.id, activeSession.id);
      }
    } catch (err: any) {
      console.error(err);
      await confirm({ title: "Error", message: "Error submitting answer: " + err.message, confirmText: "OK", hideCancel: true });
    }
  };

  const handleNext = () => {
    advancePracticeQuestion(currentCase.id, activeSession.id);
    setShowAllOptions(false);
  };

  const handleEarlyFinish = async () => {
    if (await confirm({ 
      title: "Finish the exam now?", 
      message: "Unanswered questions will be recorded as unanswered. You will then see your results and explanations.", 
      confirmText: "Finish and View Results" 
    })) {
      completePracticeSession(currentCase.id, activeSession.id, "finished-early");
      router.push(`/case/results?id=${currentCase.id}&sessionId=${activeSession.id}`);
    }
  };

  const handleExit = async () => {
    if (await confirm({ 
      title: activeSession.mode === "exam" ? "Exit Exam Mode?" : "Exit Practice", 
      message: activeSession.timerConfig.mode !== "none" ? "The exam timer will continue while you are away." : "Your progress is saved.", 
      confirmText: "Save and Exit" 
    })) {
      router.push(`/case?id=${currentCase.id}`);
    }
  };

  const remainingTotal = getRemainingSeconds(activeSession.expiresAt, now);
  const remainingQ = getRemainingSeconds(activeSession.currentQuestionExpiresAt, now);

  const activeConfidence = isSubmitted ? (existingAttempt?.confidence || null) : confidence;
  const isCorrectlyAnswered = existingAttempt?.isCorrect;
  const correctOptionId = currentQuestionRaw.correctOptionId || currentQuestionRaw.options?.find(o => o.isCorrect)?.id;

  const actualSelectedOption = isSubmitted ? existingAttempt?.selectedOptionId : selectedOption;
  const selectedOptData = currentQuestion?.options?.find(o => o.id === actualSelectedOption);
  const correctOptData = currentQuestion?.options?.find(o => o.id === correctOptionId);

  return (
    <div className="container">
      {activeSession.purpose === "adaptive-review" && activeSession.adaptiveContext && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-secondary)' }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded" style={{ backgroundColor: '#ffffff', color: 'var(--text-primary)', boxShadow: '0 2px 7px rgba(0,0,0,0.05)' }}>
              Adaptive Review
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {activeSession.adaptiveContext.targetDifficulty}
            </span>
          </div>
          <p className="m-0 text-sm" style={{ color: 'var(--text-primary)' }}>
            <strong>Focus:</strong> {activeSession.adaptiveContext.questionPurpose.replace(/-/g, ' ')}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="m-0 text-[var(--text-primary)]">Question {currentIndex + 1} of {questions.length}</h2>
          {activeSession.mode === "exam" && <span className="text-sm text-[var(--text-muted)] mt-1 block">Exam Mode</span>}
        </div>
        <div className="flex gap-4 items-center">
          {remainingTotal !== null && (
            <div className={`timer ${remainingTotal < 60 ? 'timerWarning' : ''} text-center px-4 py-2 border rounded bg-white font-mono`}>
              <span className="text-xs text-gray-500 block uppercase tracking-wider">Total Time</span>
              <strong>{formatTime(remainingTotal)}</strong>
            </div>
          )}
          {remainingQ !== null && (
            <div className={`timer ${remainingQ < 10 ? 'timerWarning text-[var(--error)]' : ''} text-center px-4 py-2 border rounded bg-white font-mono`}>
              <span className="text-xs text-gray-500 block uppercase tracking-wider">Question Time</span>
              <strong>{formatTime(remainingQ)}</strong>
            </div>
          )}
          <span className="text-sm px-3 py-1 rounded bg-[var(--card-border)]">{currentQuestion.difficulty || "Standard"}</span>
          <button onClick={handleExit} className="btn btn-secondary text-sm">Save & Exit</button>
        </div>
      </div>
      
      <div className="glass-card mb-8">
        <p className="text-xl font-medium mb-6" style={{ color: "var(--text-primary)" }}>{currentQuestion.stem || (currentQuestion as any).text}</p>
        
        <div className="grid gap-3 mb-6">
          {currentQuestion.options?.map((option, idx) => {
            const optId = option.id;
            let btnClass = "option-btn";
            
            if (isSubmitted && mayRevealFeedback) {
              if (optId === correctOptionId) {
                btnClass += " correct";
              } else if (optId === actualSelectedOption) {
                btnClass += " incorrect";
              } else {
                btnClass += " opacity-50";
              }
            } else if (isSubmitted && !mayRevealFeedback) {
               // Locked, no feedback
               if (optId === actualSelectedOption) {
                 btnClass += " selected";
               } else {
                 btnClass += " opacity-50";
               }
            } else if (actualSelectedOption === optId) {
              btnClass += " selected";
            }

            return (
              <button
                key={optId}
                onClick={() => handleSelect(optId)}
                disabled={isSubmitted || isCompleted}
                className={btnClass}
              >
                <div className="flex gap-3">
                  <span className="font-bold">{option.label}.</span>
                  <span style={{ color: "var(--text-primary)" }}>{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        <ConfidenceSelector
          value={activeConfidence}
          onChange={handleConfidenceChange}
          disabled={isSubmitted || isCompleted || !selectedOption}
          error={confidenceError}
        />
      </div>

      {isSubmitted && !mayRevealFeedback && (
         <div className="p-4 mb-8 rounded bg-gray-50 border border-gray-200 text-gray-600 text-center font-medium">
           Answer recorded. Feedback is hidden during Exam Mode.
         </div>
      )}

      {isSubmitted && mayRevealFeedback && (
        <QuestionReviewCard 
          key={existingAttempt?.id || currentQuestion.id} 
          question={currentQuestion as unknown as McqQuestion} 
          analysis={
            activeSession.questionAnalyses?.find(a => a.attemptId === existingAttempt?.id) ||
            buildQuestionReviewAnalysis(currentQuestion as unknown as McqQuestion, existingAttempt as QuestionAttempt, activeSession)
          }
          hideQuestionContext={true}
        />
      )}

      <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <button onClick={handleEarlyFinish} className="btn btn-secondary text-sm text-[var(--error)] border-none hover:bg-[var(--error-bg)]">
          Finish Early
        </button>

        {!(isSubmitted) ? (
          <button onClick={handleSubmit} disabled={!selectedOption} className="btn btn-primary">
            Submit Answer
          </button>
        ) : mayRevealFeedback || activeSession.mode === "exam" ? (
          <button onClick={handleNext} className="btn btn-primary">
            {currentIndex >= questions.length - 1 ? "Finish Exam" : "Next Question"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <PracticePageContent />
    </Suspense>
  );
}
