"use client";

import { useCaseStore, getPracticeSessions } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { getConfidenceInsight } from "@/lib/confidenceUtils";
import { ReasoningTimeline } from "@/components/ReasoningTimeline";

function FullReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id") || "";
  const cases = useCaseStore((state) => state.cases);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentCase = cases.find((c) => c.id === caseId);

  if (!currentCase) {
    return <div className="text-center mt-12">Report Unavailable</div>;
  }

  const handlePrint = () => window.print();

  return (
    <div className="container bg-white p-8 sm:p-12 text-black print:p-0 print:text-sm">
      <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b">
        <button onClick={() => router.back()} className="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <button onClick={handlePrint} className="btn btn-print">Print / Save PDF</button>
      </div>

      <div className="text-center border-b pb-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Full Learning Report</h1>
        <p className="text-gray-500">CaseLens AI</p>
      </div>

      {/* Overview */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">Case Overview</h2>
        <h3 className="mb-2">{currentCase.title || "Untitled Case"}</h3>
        <p className="whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded-lg">{currentCase.content}</p>
      </div>

      {/* Progressive Reasoning Timeline */}
      {currentCase.progressiveSession && currentCase.progressiveCase && currentCase.progressiveSession.status === "completed" && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">Progressive Reveal Timeline</h2>
          <ReasoningTimeline 
            responses={currentCase.progressiveSession.stageResponses} 
            stages={currentCase.progressiveCase.stages} 
          />
        </div>
      )}

      {/* Adaptive Difficulty Summary */}
      {currentCase.adaptiveDifficultyEnabled && currentCase.adaptiveDecisions && currentCase.adaptiveDecisions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">Adaptive Difficulty Summary</h2>
          <div className="space-y-4">
            {currentCase.adaptiveDecisions.map(decision => (
              <div key={decision.id} className="border p-4 rounded-lg bg-gray-50 border-l-4 border-l-[var(--accent-color)]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">Concept: {decision.conceptId.split('.').pop()?.replace(/-/g, ' ')}</h3>
                  <span className="bg-white px-2 py-1 rounded text-sm font-bold shadow-sm">
                    {decision.previousDifficulty} → {decision.nextDifficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2"><strong>Reason:</strong> {decision.reasonCode.replace(/-/g, ' ')}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Focus:</strong> {decision.purpose.replace(/-/g, ' ')}</p>
                <p className="text-xs text-gray-500">Based on {decision.evidenceCount} recent attempts.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Differential Builder Output */}
      {currentCase.differentialSubmission && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">Differential Reasoning</h2>
          
          {currentCase.differentialSubmission.status === "skipped" ? (
            <div className="bg-gray-50 p-4 rounded-lg text-gray-500 italic">
              Learner differential exercise was skipped for this case.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Learner Differential</h3>
                
                <div className="mb-4">
                  <span className="font-bold text-gray-600 block mb-1">Leading Interpretation:</span>
                  <p className="text-lg font-medium">{currentCase.differentialSubmission.entries.find((e:any) => e.role === "primary")?.interpretation}</p>
                </div>

                <div className="mb-4">
                  <span className="font-bold text-gray-600 block mb-1">Alternatives:</span>
                  <ul className="list-disc pl-5">
                    {currentCase.differentialSubmission.entries.filter((e:any) => e.role === "alternative").map((e:any, i:number) => (
                      <li key={i}>{e.interpretation}</li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <span className="font-bold text-gray-600 block mb-1">Most Influential Finding:</span>
                  <p><strong>{currentCase.differentialSubmission.mostInfluentialFinding}</strong></p>
                  <p className="italic text-gray-600">{currentCase.differentialSubmission.influentialFindingReason}</p>
                </div>

                <div>
                  <span className="font-bold text-gray-600 block mb-1">Confidence:</span>
                  <p>{currentCase.differentialSubmission.confidence}</p>
                </div>
              </div>

              {currentCase.differentialSubmission.status === "comparison-failed" && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
                  <p className="font-bold">Automated differential comparison was unavailable.</p>
                  <p>The learner submission and educational analysis are included separately.</p>
                </div>
              )}

              {currentCase.differentialSubmission.comparison && (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-4 text-blue-900">Differential Comparison</h3>
                  
                  <div className="mb-4">
                    <span className="font-bold block mb-1">Areas of Alignment:</span>
                    <p>{currentCase.differentialSubmission.comparison.overlapSummary}</p>
                  </div>

                  {currentCase.differentialSubmission.comparison.missingConsiderations.length > 0 && (
                    <div className="mb-4">
                      <span className="font-bold block mb-1">Missing Considerations:</span>
                      <ul className="list-disc pl-5">
                        {currentCase.differentialSubmission.comparison.missingConsiderations.map((m:string, i:number) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}

                  {currentCase.differentialSubmission.comparison.unsupportedAssumptions.length > 0 && (
                    <div className="mb-4">
                      <span className="font-bold block mb-1">Unsupported Assumptions:</span>
                      <ul className="list-disc pl-5">
                        {currentCase.differentialSubmission.comparison.unsupportedAssumptions.map((u:string, i:number) => <li key={i}>{u}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="mb-4">
                    <span className="font-bold block mb-1">Evidence Use:</span>
                    <ul className="list-disc pl-5">
                      {currentCase.differentialSubmission.comparison.evidenceUseAnalysis.map((ev:string, i:number) => <li key={i}>{ev}</li>)}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold block mb-1">Learning Priorities:</span>
                    <ul className="list-disc pl-5">
                      {currentCase.differentialSubmission.comparison.learningPriorities.map((lp:string, i:number) => <li key={i}>{lp}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis */}
      {currentCase.analysis && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">AI Analysis</h2>
          <div className="whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded-lg">
            {currentCase.analysis}
          </div>
        </div>
      )}

      {/* MCQ Review */}
      {currentCase && (currentCase.mcqs || currentCase.questions) && (() => {
        const questions = currentCase.mcqs || currentCase.questions || [];
        const sessions = getPracticeSessions(currentCase);
        const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
        const attempts = latestSession?.attempts || currentCase.attempts || [];
        
        const correctCount = attempts.filter(a => a.isCorrect).length;
        
        return (
          <div className="mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-gray-200 pb-2 mb-4">MCQ Review</h2>
            
            <div className="mb-6 flex gap-4 text-sm font-medium">
              <span className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                Score: {correctCount} / {questions.length}
              </span>
              {latestSession && (
                <span className="bg-blue-50 px-3 py-1 rounded text-blue-700">
                  {latestSession.mode === "exam" ? "Exam Mode" : "Learning Mode"}
                </span>
              )}
            </div>
            
            <div className="space-y-6">
              {questions.map((q: any, idx: number) => {
                const qId = q.id || `q-${idx}`;
                const attempt = attempts.find(a => a.questionId === qId);
                const userAnswerId = attempt?.selectedOptionId;
                
                return (
                  <div key={qId} className="border p-4 rounded-lg bg-gray-50">
                    <h3 className="mb-3">{idx + 1}. {q.stem || q.text}</h3>
                    <ul className="space-y-2">
                      {q.options.map((opt: any, optIdx: number) => {
                        const optId = opt.id || `opt-${optIdx}`;
                        const isSelected = userAnswerId === optId;
                        let className = "p-2 rounded border ";
                        if (opt.isCorrect) className += "bg-green-100 border-green-400 font-bold text-green-800";
                        else if (isSelected) className += "bg-red-100 border-red-400 font-bold text-red-800";
                        else className += "bg-white border-gray-200 text-gray-600";
                        
                        return (
                          <li key={optId} className={className}>
                            {opt.text} {opt.isCorrect && "✓"} {isSelected && !opt.isCorrect && "✗ (Your Answer)"}
                          </li>
                        );
                      })}
                    </ul>

                    {!(!currentCase.mcqs && currentCase.questions) && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-900">
                        <p className="font-bold uppercase text-xs mb-1">
                          Confidence: {attempt?.confidence || "Not recorded"}
                        </p>
                        <p>
                          {getConfidenceInsight({
                            isCorrect: attempt?.isCorrect || false,
                            confidence: attempt?.confidence
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      
      <div className="mt-12 pt-4 border-t text-sm text-gray-500 text-center">
        Printed on {new Date().toLocaleDateString()}. This report was generated locally and securely by CaseLens AI.
      </div>
    </div>
  );
}

export default function FullReport() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <FullReportContent />
    </Suspense>
  );
}
