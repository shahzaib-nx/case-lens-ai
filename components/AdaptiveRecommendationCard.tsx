"use client";

import { AdaptiveDecision } from "@/lib/store";
import { getAdaptiveDecisionExplanation } from "@/lib/adaptive";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdaptiveRecommendationCard({
  decision,
  caseId,
  onStart,
  isGenerating
}: {
  decision: AdaptiveDecision;
  caseId: string;
  onStart: (decision: AdaptiveDecision) => void;
  isGenerating: boolean;
}) {
  const explanation = getAdaptiveDecisionExplanation(decision);
  
  return (
    <div className="glass-card mb-4" style={{ borderLeft: '4px solid var(--accent-color)' }}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="flex items-center gap-2 m-0 text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          Adaptive Review: {decision.conceptId.split('.').pop()?.replace(/-/g, ' ')}
        </h3>
        <span className="text-xs font-bold px-2 py-1 bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded">
          {decision.nextDifficulty}
        </span>
      </div>
      
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {explanation}
      </p>

      <div className="flex justify-between items-center mt-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-bold">
          Focus: {decision.purpose.replace(/-/g, ' ')}
        </div>
        <button 
          className="btn btn-primary bg-[var(--accent-color)] text-white border-0 text-sm py-1 px-4"
          onClick={() => onStart(decision)}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Start Adaptive Practice"}
        </button>
      </div>
    </div>
  );
}
