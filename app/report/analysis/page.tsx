"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function AnalysisReportContent() {
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
    <div className="container bg-white text-black p-8 rounded-xl">
      <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b">
        <button onClick={() => router.back()} className="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Case
        </button>
        <button onClick={handlePrint} className="btn btn-print">Print / Save PDF</button>
      </div>

      <div className="text-center border-b pb-6 mb-8">
        <h1 className="mb-2">Educational Case Analysis</h1>
        <p className="text-gray-500">CaseLens AI Report</p>
      </div>

      <div className="mb-8">
        <h2 className="border-b pb-2 mb-4">Case Overview</h2>
        <h3 className="mb-2">{currentCase.title || "Untitled Case"}</h3>
        <p className="whitespace-pre-wrap text-gray-800">{currentCase.content}</p>
      </div>

      <div>
        <h2 className="border-b pb-2 mb-4">AI Analysis</h2>
        <div className="whitespace-pre-wrap text-gray-800">
          {currentCase.analysis}
        </div>
      </div>
      
      <div className="mt-12 pt-4 border-t text-sm text-gray-500 text-center">
        Printed on {new Date().toLocaleDateString()}. This report was generated locally and securely by CaseLens AI.
      </div>
    </div>
  );
}

export default function AnalysisReport() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <AnalysisReportContent />
    </Suspense>
  );
}
