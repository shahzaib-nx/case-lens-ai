"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { getConfidenceInsight } from "@/lib/confidenceUtils";

function MCQReportContent() {
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
  
  const questions = currentCase.mcqs || currentCase.questions;

  if (!questions) {
    return <div className="text-center mt-12">Report Unavailable</div>;
  }

  const latestAttemptsMap = new Map();
  if (currentCase.attempts) {
    currentCase.attempts.forEach(a => {
      latestAttemptsMap.set(a.questionId, a);
    });
  }

  const handlePrint = () => window.print();

  return (
    <div className="container bg-white text-black p-8 rounded-xl">
      <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b">
        <button onClick={() => router.back()} className="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Results
        </button>
        <button onClick={handlePrint} className="btn btn-print">Print / Save PDF</button>
      </div>

      <div className="text-center border-b pb-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">MCQ Review</h1>
        <h2 className="text-xl text-gray-600 mb-2">{currentCase.title || "Untitled Case"}</h2>
        {currentCase.score !== undefined && (
          <p className="text-lg font-medium text-blue-600">
            Score: {currentCase.score} / {questions.length}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {questions.map((q: any, idx: number) => {
          const qId = q.id || `q-${idx}`;
          return (
            <div key={qId} className="border p-4 rounded-lg">
              <h3 className="mb-4">{idx + 1}. {q.stem || q.text}</h3>
              <ul className="space-y-2">
                {q.options.map((opt: any, optIdx: number) => {
                  const optId = opt.id || `opt-${optIdx}`;
                  const isSelected = currentCase.answers && currentCase.answers[qId] === optId;
                  let className = "p-2 rounded border ";
                  if (opt.isCorrect) className += "bg-green-100 border-green-400 font-bold text-green-800";
                  else if (isSelected) className += "bg-red-100 border-red-400 font-bold text-red-800";
                  else className += "bg-gray-50 border-gray-200 text-gray-600";
                  
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
                    Confidence: {latestAttemptsMap.get(qId)?.confidence || "Not recorded"}
                  </p>
                  <p>
                    {getConfidenceInsight({
                      isCorrect: currentCase.answers?.[qId] === q.correctOptionId || q.options.find((o: any) => o.id === currentCase.answers?.[qId])?.isCorrect,
                      confidence: latestAttemptsMap.get(qId)?.confidence
                    })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 pt-4 border-t text-sm text-gray-500 text-center">
        Printed on {new Date().toLocaleDateString()}. This report was generated locally and securely by CaseLens AI.
      </div>
    </div>
  );
}

export default function MCQReport() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <MCQReportContent />
    </Suspense>
  );
}
