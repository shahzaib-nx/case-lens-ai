"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiUrl } from "@/lib/api-client";
import Link from "next/link";
import { useConfirm } from "@/components/ConfirmProvider";
import { Dropdown } from '@/components/Dropdown';

function StudyMaterialPageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id") || "";
  const router = useRouter();
  const { cases, updateCase } = useCaseStore();
  const [mounted, setMounted] = useState(false);
  
  const [depth, setDepth] = useState<"Quick" | "Standard" | "Deep">("Standard");
  const [generating, setGenerating] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentCase = cases.find((c) => c.id === caseId);

  if (!currentCase) {
    return (
      <div className="max-w-xl mx-auto glass-card text-center mt-12">
        <h2 className="text-[var(--error)] mb-4">Case Not Found</h2>
        <button onClick={() => router.push("/")} className="btn btn-primary">Go Home</button>
      </div>
    );
  }

  // Get the latest generated material for this case, if any
  const existingMaterial = currentCase.studyMaterials?.[currentCase.studyMaterials.length - 1];

  const handleGenerate = async () => {
    if (existingMaterial) {
      if (!(await confirm({ title: "Regenerate Material", message: "Regenerate study material? This will create a new version based on your selected study depth.", confirmText: "Regenerate" }))) {
        return;
      }
    }
    
    setGenerating(true);
    
    // In a real flow, we'd pass the actual weak concepts here from analysis. 
    // Since we don't store analysis locally yet in the UI state, we'll pass the attempts.
    const weakConceptData = {
      caseId: currentCase.id,
      attempts: currentCase.attempts,
      mcqs: currentCase.mcqs
    };

    try {
      const res = await fetch(getApiUrl('/api/generate-study-material'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakConceptData, depth }),
      });
      
      if (!res.ok) throw new Error("Generation failed");
      
      const newMaterial = await res.json();
      
      // Save it
      updateCase(currentCase.id, {
        studyMaterials: [...(currentCase.studyMaterials || []), newMaterial]
      });
      
    } catch (error) {
      console.error(error);
      await confirm({ title: "Error", message: "Failed to generate study material. Please try again.", confirmText: "OK", hideCancel: true });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl mb-1 text-[var(--text-primary)]">Focused Study Material</h1>
          <p className="text-sm opacity-80">{currentCase.title}</p>
        </div>
        <button onClick={() => router.push(`/case/results?id=${currentCase.id}`)} className="btn btn-secondary text-sm">Back to Results</button>
      </div>

      <div className="glass-card mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="mb-2 font-bold">Study Depth</h3>
          <p className="text-sm opacity-80 mb-4 md:mb-0">Select how deep you want the AI to go into the core concepts you struggled with.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            value={depth}
            onChange={(val) => setDepth(val as "Quick" | "Standard" | "Deep")}
            disabled={generating}
            className="md:w-64"
            options={[
              { value: "Quick", label: "Quick Review (3-5 min)" },
              { value: "Standard", label: "Standard Review (8-12 min)" },
              { value: "Deep", label: "Deep Review (15-25 min)" },
            ]}
          />
          <button 
            onClick={handleGenerate} 
            disabled={generating}
            className="btn btn-primary whitespace-nowrap"
          >
            {generating ? "Generating..." : existingMaterial ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {generating && (
        <div className="glass-card text-center py-12 mb-8">
          <svg className="animate-spin h-8 w-8 text-[var(--accent-color)] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 className="mb-2 text-[var(--text-primary)]">Building your revision plan...</h3>
          <p className="text-sm opacity-80">This may take a few moments depending on the depth selected.</p>
        </div>
      )}

      {!generating && existingMaterial && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="glass-card bg-indigo-50 border-indigo-100">
            <h2 className="text-xl mb-4 text-[var(--accent-color)]">Core Explanation</h2>
            <p className="text-sm leading-relaxed mb-6">{existingMaterial.coreExplanation}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm uppercase tracking-wider font-bold mb-3 text-gray-500">Learning Objectives</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {existingMaterial.objectives?.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-wider font-bold mb-3 text-gray-500">Key Facts</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {existingMaterial.keyFacts?.map((fact: string, i: number) => <li key={i}>{fact}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card">
              <h3 className="mb-3 text-[var(--text-primary)]">Reasoning Approach</h3>
              <ol className="list-decimal pl-5 text-sm space-y-2">
                {existingMaterial.reasoningApproach?.map((step: string, i: number) => <li key={i}>{step}</li>)}
              </ol>
            </div>
            
            <div className="glass-card bg-[var(--error-bg)] border-[var(--error)]/20">
              <h3 className="mb-3 text-[var(--error)]">Common Mistakes & Traps</h3>
              <ul className="list-disc pl-5 text-sm space-y-2 mb-4">
                {existingMaterial.commonMistakes?.map((mistake: string, i: number) => <li key={i}>{mistake}</li>)}
              </ul>
              {existingMaterial.examTraps && existingMaterial.examTraps.length > 0 && (
                <>
                  <h4 className="text-sm mb-2 mt-4">Exam Traps:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {existingMaterial.examTraps.map((trap: string, i: number) => <li key={i}>{trap}</li>)}
                  </ul>
                </>
              )}
            </div>
          </div>

          {existingMaterial.comparisonTable && existingMaterial.comparisonTable.headers && (
            <div className="glass-card overflow-x-auto">
              <h3 className="mb-4">Differential Comparison</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                  <tr>
                    {existingMaterial.comparisonTable.headers.map((h: string, i: number) => <th key={i} className="px-4 py-3 border-b">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {existingMaterial.comparisonTable.rows?.map((row: string[], i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                      {row.map((cell: string, j: number) => <td key={j} className="px-4 py-3">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {existingMaterial.workedExample && (
            <div className="glass-card bg-gray-50">
              <h3 className="mb-4">Worked Example</h3>
              <p className="text-sm font-medium italic mb-4 p-3 bg-white border rounded">"{existingMaterial.workedExample.case}"</p>
              <div className="mb-4">
                <p className="font-bold text-sm mb-2">Reasoning:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {existingMaterial.workedExample.reasoning?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <p className="text-sm"><span className="font-bold text-[var(--success)]">Answer:</span> {existingMaterial.workedExample.answer}</p>
            </div>
          )}

          {existingMaterial.selfCheckQuestions && existingMaterial.selfCheckQuestions.length > 0 && (
            <div className="glass-card">
              <h3 className="mb-4">Self-Check Questions</h3>
              <div className="space-y-4">
                {existingMaterial.selfCheckQuestions.map((sq: any, i: number) => (
                  <details key={i} className="bg-white border rounded p-3 cursor-pointer group">
                    <summary className="text-sm font-medium outline-none">Q: {sq.question}</summary>
                    <p className="mt-3 text-sm pt-3 border-t text-[var(--accent-color)] font-medium cursor-text">A: {sq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function StudyMaterialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-gray-500">Loading...</div>}>
      <StudyMaterialPageContent />
    </Suspense>
  );
}
