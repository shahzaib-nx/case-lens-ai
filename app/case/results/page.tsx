"use client";

import { useCaseStore, McqQuestion } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api-client";
import PieChart from "@/components/PieChart";
import { calculateConfidenceSummary, getConfidenceCalibration, getConfidenceInsight } from "@/lib/confidenceUtils";
import { getPracticeSessions, AdaptiveDecision, QuestionAttempt, getLatestSession } from "@/lib/store";
import { decideNextDifficulty, extractEligibleAdaptiveEvidence, createAdaptiveDecisionKey } from "@/lib/adaptive";
import { AdaptiveRecommendationCard } from "@/components/AdaptiveRecommendationCard";
import { QuestionReviewCard } from "@/components/QuestionReviewCard";
import { buildQuestionReviewAnalysis } from "@/lib/reviewBuilder";

function IndividualResultsPageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id") || "";
  const urlSessionId = searchParams.get("sessionId");
  const router = useRouter();
  const { cases, updateCase, updateConceptPerformance, createPracticeSession, saveAdaptiveDecision } = useCaseStore();
  const [mounted, setMounted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const [generatingAdaptive, setGeneratingAdaptive] = useState(false);
  const [adaptiveDecisions, setAdaptiveDecisions] = useState<AdaptiveDecision[]>([]);

  useEffect(() => setMounted(true), []);

  const currentCase = cases.find((c) => c.id === caseId);

  useEffect(() => {
    if (mounted && currentCase?.attempts && currentCase.attempts.length > 0 && !analysisResult && !analyzing) {
      setAnalyzing(true);
      fetch(getApiUrl('/api/analyze-performance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptsData: { caseId: currentCase.id, attempts: currentCase.attempts, questions: currentCase.mcqs } }),
      })
      .then(res => res.json())
      .then(data => {
        setAnalysisResult(data);
        setAnalyzing(false);
        // We could also loop over data.weakConcepts and data.strongConcepts to update global conceptStore here
      })
      .catch(err => {
        console.error(err);
        setAnalyzing(false);
      });
    }
  }, [mounted, currentCase, analysisResult, analyzing]);

  const isLegacy = !currentCase?.mcqs;
  const questions = useMemo(() => {
    if (!currentCase) return [];
    return currentCase.mcqs || currentCase.questions || [];
  }, [currentCase]);
  const totalQuestions = questions.length;

  const latestSession = useMemo(() => {
    if (!currentCase) return undefined;
    if (urlSessionId && currentCase.practiceSessions) {
      const explicitSession = currentCase.practiceSessions.find(s => s.id === urlSessionId);
      if (explicitSession) return explicitSession;
    }
    return getLatestSession(currentCase);
  }, [currentCase, urlSessionId]);

  // 1. Local Adaptive Decision Calculation (Idempotent)
  useEffect(() => {
    if (mounted && currentCase && currentCase.adaptiveDifficultyEnabled && !isLegacy && latestSession?.status === "completed") {
      const mcqs = currentCase.mcqs || [];
      const newDecisions: AdaptiveDecision[] = [];

      // Extract unique concept IDs tested in this session
      const testedConceptIds = new Set<string>();
      latestSession.attempts.forEach(a => {
        const q = mcqs.find(mq => mq.id === a.questionId);
        if (q?.conceptTags?.[0]?.conceptId) {
          testedConceptIds.add(q.conceptTags[0].conceptId);
        }
      });

      // Calculate decisions for each tested concept
      testedConceptIds.forEach(conceptId => {
        const allAttempts = currentCase.attempts || [];
        const evidence = extractEligibleAdaptiveEvidence(allAttempts, mcqs, conceptId);
        
        // Find current difficulty for this concept from the most recent attempt
        const recentAttempt = evidence[evidence.length - 1];
        if (!recentAttempt) return;

        const result = decideNextDifficulty({
          currentDifficulty: recentAttempt.difficulty,
          conceptId,
          recentEvidence: evidence
        });

        // Only create a decision if it's actionable (not insufficient-evidence)
        if (result.reasonCode !== "insufficient-evidence") {
          const attemptIds = evidence.map(e => e.attemptId);
          const decisionKey = createAdaptiveDecisionKey(conceptId, recentAttempt.difficulty, attemptIds);
          
          const decision: AdaptiveDecision = {
            id: crypto.randomUUID(),
            decisionKey,
            conceptId,
            previousDifficulty: recentAttempt.difficulty,
            nextDifficulty: result.nextDifficulty,
            decision: result.decision,
            purpose: result.purpose,
            reasonCode: result.reasonCode,
            evidenceAttemptIds: attemptIds,
            evidenceCount: evidence.length,
            ruleVersion: 1,
            createdAt: new Date().toISOString()
          };

          // Save globally (it handles idempotency internally via decisionKey)
          saveAdaptiveDecision(currentCase.id, decision);
          newDecisions.push(decision);
        }
      });

      // Update local state to reflect the latest decisions for rendering
      // We also look at existing globally saved decisions that match our current calculation
      const activeDecisions = (currentCase.adaptiveDecisions || []).filter(d => 
        newDecisions.some(nd => nd.decisionKey === d.decisionKey)
      );
      
      // If we found any new ones that weren't in state yet, merge them
      const allActiveDecisions = [...activeDecisions];
      newDecisions.forEach(nd => {
        if (!allActiveDecisions.some(d => d.decisionKey === nd.decisionKey)) {
          allActiveDecisions.push(nd);
        }
      });

      setAdaptiveDecisions(allActiveDecisions);
    }
  }, [mounted, currentCase?.id, latestSession?.status, isLegacy, saveAdaptiveDecision]);

  if (!mounted) return null;

  if (!currentCase || !latestSession) {
    return (
      <div className="max-w-xl mx-auto glass-card text-center mt-12">
        <h2 className="text-[var(--error)] mb-4">Results Unavailable</h2>
        <p className="mb-8">No results found for this case. You may need to finish the practice first.</p>
        <button onClick={() => router.push(`/case/practice?id=${caseId}`)} className="btn btn-primary">Go to Practice</button>
      </div>
    );
  }

  const finalAttempts = latestSession.attempts;
  const confidenceSummary = calculateConfidenceSummary(finalAttempts);
  const calibration = getConfidenceCalibration(confidenceSummary);
  
  const correctCount = finalAttempts.filter(a => a.isCorrect).length;
  const unansweredCount = totalQuestions - finalAttempts.length;

  const handleRetake = () => {
    if (confirm("Are you sure you want to retake this quiz? Your previous session history will be preserved.")) {
      const mode = currentCase.practiceMode || "learning";
      const timer = currentCase.timerConfig || { mode: "none" };
      createPracticeSession(currentCase.id, mode, timer);
      router.push(`/case/practice?id=${currentCase.id}`);
    }
  };

  const handleStartNewCase = () => {
    if (confirm("Are you sure you want to start a new case?")) {
      router.push("/new-case");
    }
  };



  const handleStartAdaptiveSession = async (decision: AdaptiveDecision) => {
    if (!currentCase) return;
    setGeneratingAdaptive(true);
    
    try {
      const avoidQuestionIds = currentCase.mcqs?.map(q => q.id) || [];
      
      const response = await fetch(getApiUrl('/api/generate-mcqs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentCase.content,
          analysis: currentCase.analysis,
          difficulty: decision.nextDifficulty,
          examStyle: currentCase.examStyle || "General",
          questionCount: 3, // Batch of 3 for adaptive sessions
          adaptiveContext: {
            conceptId: decision.conceptId,
            targetDifficulty: decision.nextDifficulty,
            questionPurpose: decision.purpose
          },
          avoidQuestionIds
        })
      });

      if (!response.ok) throw new Error("Failed to generate adaptive questions");
      
      const data = await response.json();
      
      // Append new MCQs to case
      const updatedMcqs = [...(currentCase.mcqs || []), ...data.mcqs];
      updateCase(currentCase.id, { mcqs: updatedMcqs });
      
      // Create specific adaptive session
      createPracticeSession(
        currentCase.id, 
        "learning", // Always learning mode for adaptive review
        { mode: "none" }, // No timer
        "adaptive-review",
        {
          conceptId: decision.conceptId,
          targetDifficulty: decision.nextDifficulty,
          questionPurpose: decision.purpose,
          sourceDecisionId: decision.id
        }
      );
      
      router.push(`/case/practice?id=${currentCase.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate adaptive questions. Please try again.");
      setGeneratingAdaptive(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-card text-center mb-8">
        <h2 className="mb-2">Learning Analysis</h2>
        <p className="text-sm opacity-80 mb-2">{currentCase.title}</p>
        <div className="flex justify-center items-center gap-2 mb-6">
           <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold uppercase tracking-wider">
             {latestSession.mode === "exam" ? "Exam Mode" : "Learning Mode"}
           </span>
           {latestSession.timerConfig?.mode !== "none" && (
             <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold uppercase tracking-wider flex items-center gap-1">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
               {latestSession.timerConfig.mode === "total" ? `${latestSession.timerConfig.totalDurationSeconds! / 60}m Total` : `${latestSession.timerConfig.secondsPerQuestion}s / Q`}
             </span>
           )}
        </div>
        
        <div className="flex flex-col items-center justify-center mb-6">
          <PieChart correct={correctCount} total={totalQuestions} size={140} />
          <div className="mt-4 text-lg font-bold text-gray-500">
            {correctCount} out of {totalQuestions} correct
          </div>
          {unansweredCount > 0 && (
            <p className="text-sm text-[var(--error)] mt-2 font-medium">
              {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <button onClick={handleRetake} className="btn btn-secondary">Retake Quiz</button>
          <button onClick={() => router.push(`/case?id=${currentCase.id}`)} className="btn btn-secondary">Review Analysis</button>
          <Link href={`/case/study?id=${currentCase.id}`} className="btn btn-primary bg-[var(--accent-color)] text-white border-0 col-span-2 sm:col-span-2">
            Generate Study Material
          </Link>
        </div>
      </div>

      {currentCase.progressiveSession && currentCase.progressiveSession.status === "completed" && currentCase.progressiveCase && (
        <div className="mb-12">
          <h2 className="mb-6">Progressive Reasoning Summary</h2>
          <div className="glass-card">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Stages Completed</p>
                <p className="text-2xl font-bold text-[var(--accent-color)]">{currentCase.progressiveSession.stageResponses.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Differential Changed</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {currentCase.progressiveSession.stageResponses.filter((r: any) => r.differentialChanged === "yes").length} times
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Final Confidence</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {currentCase.progressiveSession.stageResponses[currentCase.progressiveSession.stageResponses.length - 1]?.confidence || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Link href={`/case?id=${currentCase.id}`} className="text-sm font-bold text-[var(--accent-color)] hover:underline">
                Review Progressive Timeline →
              </Link>
            </div>
          </div>
        </div>
      )}

      {currentCase.differentialSubmission && (
        <div className="mb-12">
          <h2 className="mb-6">Case Reasoning Summary</h2>
          <div className="glass-card">
            {currentCase.differentialSubmission.status === "skipped" ? (
              <p className="text-[var(--text-secondary)] italic">Differential exercise skipped.</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Leading Interpretation</p>
                    <p className="font-bold text-[var(--text-primary)]">
                      {currentCase.differentialSubmission.entries.find((e: any) => e.role === "primary")?.interpretation || "Not recorded"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Alternatives</p>
                    <p className="text-2xl font-bold text-[var(--accent-color)]">
                      {currentCase.differentialSubmission.entries.filter((e: any) => e.role === "alternative").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Confidence</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{currentCase.differentialSubmission.confidence}</p>
                  </div>
                </div>
                
                {currentCase.differentialSubmission.comparison && currentCase.differentialSubmission.comparison.learningPriorities.length > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <p className="font-bold mb-1 text-[var(--accent-color)]">Main Comparison Learning Point</p>
                    <p className="text-sm text-[var(--text-secondary)]">{currentCase.differentialSubmission.comparison.learningPriorities[0]}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <Link href={`/case?id=${currentCase.id}`} className="text-sm font-bold text-[var(--accent-color)] hover:underline">
                    Review Differential Reasoning →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isLegacy && finalAttempts.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6">Confidence Analysis</h2>
          <div className="glass-card">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Correct / High</p>
                <p className="text-2xl font-bold text-[var(--success)]">{confidenceSummary.correctHigh}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Correct / Low</p>
                <p className="text-2xl font-bold text-[var(--success)]">{confidenceSummary.correctLow}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Incorrect / High</p>
                <p className="text-2xl font-bold text-[var(--error)]">{confidenceSummary.incorrectHigh}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Not Recorded</p>
                <p className="text-2xl font-bold text-gray-400">{confidenceSummary.notRecorded}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="font-bold mb-1">Pattern: {calibration.classification}</p>
              <p className="text-sm text-[var(--text-secondary)]">{calibration.evidence}</p>
            </div>
          </div>
        </div>
      )}

      {!isLegacy && analysisResult && (
        <div className="mb-12">
          <h2 className="mb-6">Performance Breakdown</h2>
          
          {currentCase.adaptiveDifficultyEnabled && adaptiveDecisions.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-[var(--text-primary)]">Adaptive Recommendations</h3>
              <div className="space-y-4">
                {adaptiveDecisions.map(decision => (
                  <AdaptiveRecommendationCard 
                    key={decision.id}
                    decision={decision}
                    caseId={currentCase.id}
                    onStart={handleStartAdaptiveSession}
                    isGenerating={generatingAdaptive}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="glass-card mb-6">
            <h3 className="mb-2">Summary</h3>
            <p className="text-sm">{analysisResult.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card">
              <h3 className="mb-4 text-[var(--error)] flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Concepts Needing Attention
              </h3>
              {analysisResult.weakConcepts?.length > 0 ? (
                <ul className="space-y-4">
                  {analysisResult.weakConcepts.map((weak: any, i: number) => (
                    <li key={i} className="text-sm border-b pb-4 last:border-0 last:pb-0">
                      <p className="font-bold mb-1">{weak.conceptName}</p>
                      <p className="text-xs uppercase tracking-wider text-[var(--error)] font-bold mb-2">{weak.classification}</p>
                      <p className="mb-1"><strong>Likely Issue:</strong> {weak.likelyIssue}</p>
                      <p className="opacity-80"><em>Evidence: {weak.evidence?.join(" ")}</em></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No major weaknesses identified in this session.</p>
              )}
            </div>

            <div className="glass-card">
              <h3 className="mb-4 text-[var(--success)] flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Strong Concepts
              </h3>
              {analysisResult.strongConcepts?.length > 0 ? (
                <ul className="space-y-4">
                  {analysisResult.strongConcepts.map((strong: any, i: number) => (
                    <li key={i} className="text-sm border-b pb-4 last:border-0 last:pb-0">
                      <p className="font-bold mb-1">{strong.conceptName}</p>
                      <p className="opacity-80"><em>Evidence: {strong.evidence?.join(" ")}</em></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Not enough data to confirm secure concepts yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {analyzing && (
        <div className="glass-card text-center mb-12">
          <p className="animate-pulse">Analyzing your learning patterns and identifying concepts that need reinforcement...</p>
        </div>
      )}

      <div className="mb-12">
        <h2 className="mb-6">Question-by-Question Review</h2>
        <div className="space-y-6">
          {questions.map((q: any, idx: number) => {
            const questionId = q.id || `q-${idx}`;
            
            const attempt = latestSession?.attempts.find(a => a.questionId === questionId) || finalAttempts.find(a => a.questionId === questionId);
            let analysis = latestSession?.questionAnalyses?.find(a => a.questionId === questionId);
            
            if (!analysis && !isLegacy && attempt) {
               analysis = buildQuestionReviewAnalysis(q as unknown as McqQuestion, attempt, latestSession!);
            }

            if (!analysis) {
              const userAnswerId = attempt?.selectedOptionId;
              const correctOption = q.options?.find((o:any) => o.isCorrect || o.id === q.correctOptionId);
              const isCorrect = correctOption?.id === userAnswerId;
              
              const syntheticQuestion: McqQuestion = {
                id: questionId,
                stem: q.stem || q.text || "",
                options: (q.options || []).map((o:any, oIdx: number) => ({
                  id: o.id,
                  label: o.label || String.fromCharCode(65 + oIdx),
                  text: o.text,
                  isCorrect: !!(o.isCorrect || o.id === q.correctOptionId),
                  explanation: o.explanation || (!!(o.isCorrect || o.id === q.correctOptionId) ? "This is the correct answer." : "This is an incorrect answer.")
                })),
                correctOptionId: correctOption?.id || "",
                correctAnswerExplanation: q.correctAnswerExplanation || correctOption?.explanation || "This is the correct answer.",
                caseEvidence: q.caseEvidence || [],
                conceptTags: [],
                examStyle: "General"
              };

              analysis = {
                id: `analysis-${questionId}`,
                attemptId: attempt?.id || "none",
                questionId: questionId,
                status: attempt ? (isCorrect ? "correct" : "incorrect") : "unanswered",
                selectedOptionId: userAnswerId || undefined,
                correctOptionId: correctOption?.id || "",
                correctAnswerExplanation: syntheticQuestion.correctAnswerExplanation,
                optionAnalyses: syntheticQuestion.options.map((o:any) => ({
                  optionId: o.id,
                  isCorrect: o.isCorrect,
                  explanation: o.explanation,
                })),
                confidenceInsight: "Not recorded.",
                analysisVersion: 1,
                createdAt: new Date().toISOString()
              } as QuestionReviewAnalysis;
              
              return <QuestionReviewCard key={analysis.id} question={syntheticQuestion} analysis={analysis as QuestionReviewAnalysis} hideQuestionContext={false} />;
            }
            
            return <QuestionReviewCard key={analysis.id || questionId} question={q as unknown as McqQuestion} analysis={analysis} hideQuestionContext={false} />;
          })}
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
        <button onClick={() => router.push("/results")} className="btn btn-secondary">View Overall Results</button>
        <button onClick={handleStartNewCase} className="btn btn-primary px-8">Start New Case</button>
        <div className="text-center mt-12 opacity-30 text-xs">
          v1.0.4 | SESS: {latestSession?.id || 'none'} | ATTS: {latestSession?.attempts?.length || 0}
        </div>
      </div>
    </div>
  );
}

export default function IndividualResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <IndividualResultsPageContent />
    </Suspense>
  );
}
