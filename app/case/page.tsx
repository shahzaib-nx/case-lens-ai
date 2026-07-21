"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useConfirm } from "@/components/ConfirmProvider";
import { getApiUrl } from "@/lib/api-client";
import Link from "next/link";
import styles from "./case.module.css";
import { 
  isDifferentialBuilderEnabled, 
  getAnalysisRevealStatus,
  getCaseFormat,
  LearnerDifferentialDraft,
  LearnerDifferentialSubmission
} from "@/lib/store";
import { DifferentialBuilder } from "@/components/DifferentialBuilder";
import { DifferentialComparisonUI } from "@/components/DifferentialComparisonUI";
import { ProgressiveCaseReveal } from "@/components/ProgressiveCaseReveal";

function CaseAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id") || "";
  const stateParam = searchParams.get("state");
  
  const cases = useCaseStore((state) => state.cases);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingMCQs, setIsGeneratingMCQs] = useState(false);
  const [error, setError] = useState("");
  const { confirm } = useConfirm();

  const currentCase = cases.find((c) => c.id === caseId);

  useEffect(() => setMounted(true), []);

  // Initialize progressive session if needed
  useEffect(() => {
    if (currentCase && getCaseFormat(currentCase) === "progressive" && currentCase.progressiveCase && !currentCase.progressiveSession) {
      useCaseStore.getState().initProgressiveSession(currentCase.id);
    }
  }, [currentCase]);

  if (!mounted) return null;

  if (!currentCase) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.emptyState}>
            <h2 style={{color: '#c75a5a'}}>Case Unavailable</h2>
            <p>This case study could not be found. It may have been deleted.</p>
            <div className={styles.emptyStateActions}>
              <button onClick={() => router.push("/history")} className={`${styles.actionButton} ${styles.secondaryButton}`}>Back to History</button>
              <button onClick={() => router.push("/new-case")} className={`${styles.actionButton} ${styles.primaryButton}`}>Start New Case</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const handleEditCase = () => {
    router.push(`/new-case?edit=${currentCase.id}`);
  };

  const handleCopyAnalysis = async () => {
    if (currentCase.analysis) {
      try {
        await navigator.clipboard.writeText(currentCase.analysis);
        await confirm({ title: "Success", message: "Analysis copied to clipboard!", confirmText: "OK", hideCancel: true });
      } catch (err) {
        console.error(err);
        await confirm({ title: "Error", message: "Failed to copy text.", confirmText: "OK", hideCancel: true });
      }
    }
  };

  const handleGenerateMCQs = async () => {
    if (!navigator.onLine) {
      await confirm({ title: "Offline", message: "Cannot generate MCQs while offline.", confirmText: "OK", hideCancel: true });
      return;
    }
    
    if (currentCase.questions && currentCase.questions.length > 0) {
      router.push(`/case/practice?id=${currentCase.id}`);
      return;
    }

    setIsGeneratingMCQs(true);
    setError("");

    try {
      const res = await fetch(getApiUrl("/api/generate-mcqs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: currentCase.content, 
          analysis: currentCase.analysis,
          difficulty: currentCase.difficulty || "Intermediate",
          examStyle: currentCase.examStyle || "General",
          questionCount: currentCase.questionCount || 5
        }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      useCaseStore.getState().updateCase(currentCase.id, { mcqs: data.mcqs });
      router.push(`/case/practice?id=${currentCase.id}`);
    } catch (err: any) {
      console.error("Failed to generate MCQs:", err);
      await confirm({ title: "Service Unavailable", message: "AI Service temporarily unavailable. Please try again later.", confirmText: "OK", hideCancel: true });
    } finally {
      setIsGeneratingMCQs(false);
    }
  };

  const handleSaveDraft = (draft: LearnerDifferentialDraft) => {
    useCaseStore.getState().updateDifferentialDraft(currentCase.id, draft);
  };

  const handleDifferentialSubmit = async (submission: Omit<LearnerDifferentialSubmission, "id" | "status" | "submittedAt">) => {
    const fullSubmission: LearnerDifferentialSubmission = {
      ...submission,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: "comparison-pending",
    };
    useCaseStore.getState().submitDifferential(currentCase.id, fullSubmission);

    try {
      const res = await fetch(getApiUrl("/api/compare-differential"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          caseId: currentCase.id,
          differential: fullSubmission,
          caseContext: {
            title: currentCase.title,
            content: currentCase.content,
            analysis: currentCase.analysis,
            difficulty: currentCase.difficulty,
            examStyle: currentCase.examStyle
          }
        }),
      });

      if (!res.ok) throw new Error("Comparison request failed.");

      const comparison = await res.json();
      useCaseStore.getState().saveDifferentialComparison(currentCase.id, comparison);
    } catch (err) {
      console.error(err);
      useCaseStore.getState().markDifferentialComparisonFailed(currentCase.id);
    }
  };

  const handleDifferentialSkip = () => {
    useCaseStore.getState().skipDifferential(currentCase.id);
  };

  const caseFormat = getCaseFormat(currentCase);
  const isProgressiveActive = 
    caseFormat === "progressive" && 
    currentCase.progressiveSession && 
    currentCase.progressiveSession.status !== "completed" && 
    currentCase.progressiveSession.status !== "skipped";

  const isRevealed = getAnalysisRevealStatus(currentCase) === "revealed";
  const shouldShowDifferentialBuilder = 
    !isRevealed && 
    isDifferentialBuilderEnabled(currentCase) && 
    currentCase.differentialSubmission?.status !== "skipped";

  if (stateParam === "more-info") {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.emptyState}>
            <h2 style={{color: '#a87114'}}>More Information Needed</h2>
            <p>The AI determined that the provided text does not contain sufficient clinical information for a complete analysis or reliable MCQ generation.</p>
            
            <div style={{ textAlign: 'left', background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)', marginBottom: '32px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)'}}>{currentCase.analysis}</span>
            </div>

            <div className={styles.emptyStateActions}>
              <button onClick={handleEditCase} className={`${styles.actionButton} ${styles.primaryButton}`}>Edit Case</button>
              <button onClick={async () => {
                if(await confirm({ title: "Start New Case", message: "Are you sure you want to start a new case?", confirmText: "Start" })) router.push("/new-case");
              }} className={`${styles.actionButton} ${styles.secondaryButton}`}>Start New Case</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className="container">
        <div className={styles.utilityRow}>
          <button onClick={() => router.back()} className="btn-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div className={styles.utilityActions}>
            <button onClick={handleEditCase} className={`btn btn-secondary`}>
              Edit
            </button>
            <button onClick={() => router.push(`/report/analysis?id=${currentCase.id}`)} className={`btn btn-print`}>
              Print / PDF
            </button>
          </div>
        </div>

        <header className={styles.pageHeader}>
          <h1>{currentCase.title}</h1>
          {!isProgressiveActive && (
            <p className={styles.caseContentPreview}>
              {currentCase.content}
            </p>
          )}
        </header>

        {isProgressiveActive ? (
          <div style={{ marginTop: '32px' }}>
            <ProgressiveCaseReveal caseStudy={currentCase} />
          </div>
        ) : shouldShowDifferentialBuilder ? (
          <div style={{ marginTop: '32px' }}>
            <DifferentialBuilder
              caseId={currentCase.id}
              initialDraft={currentCase.differentialDraft}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleDifferentialSubmit}
              onSkip={handleDifferentialSkip}
            />
          </div>
        ) : (
          <>
            {currentCase.differentialSubmission && (
              <div style={{ marginBottom: '32px' }}>
                <DifferentialComparisonUI submission={currentCase.differentialSubmission} />
              </div>
            )}

            {caseFormat === "progressive" && currentCase.progressiveSession && currentCase.progressiveSession.status === "completed" && (
              <div style={{ marginTop: '32px' }}>
                <ProgressiveCaseReveal caseStudy={currentCase} />
              </div>
            )}

            <div className={styles.analysisCard}>
              <div className={styles.analysisContent}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentCase.analysis}
                </ReactMarkdown>
              </div>
            </div>

            {error && <div style={{color: '#c75a5a', marginBottom: '20px', textAlign: 'right', fontWeight: 'bold'}}>{error}</div>}

            <div className={styles.footerActions}>
              <button onClick={handleCopyAnalysis} className={`${styles.actionButton} ${styles.secondaryButton}`}>
                Copy Analysis
              </button>
              
              <div className={styles.rightActions}>
                <button onClick={async () => {
                  if(await confirm({ title: "Start New Case", message: "Are you sure you want to start a new case?", confirmText: "Start" })) router.push("/new-case");
                }} className={`${styles.actionButton} ${styles.secondaryButton}`}>
                  New Case
                </button>
                <button onClick={handleGenerateMCQs} className={`${styles.actionButton} ${styles.primaryButton}`} disabled={isGeneratingMCQs}>
                  {isGeneratingMCQs ? (
                    <><span className={styles.spinner}></span> Generating Practice Questions...</>
                  ) : (
                    "Generate MCQs"
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function CaseAnalysis() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>
        Loading...
      </main>
    }>
      <CaseAnalysisContent />
    </Suspense>
  );
}
