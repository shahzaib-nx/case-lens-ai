"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import PieChart from "@/components/PieChart";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiUrl } from "@/lib/api-client";
import { calculateConfidenceSummary, getConfidenceCalibration } from "@/lib/confidenceUtils";
import styles from "./results.module.css";

export default function OverallResults() {
  const router = useRouter();
  const cases = useCaseStore((state) => state.cases);
  const globalAnalysis = useCaseStore((state) => state.globalAnalysis);
  const setGlobalAnalysis = useCaseStore((state) => state.setGlobalAnalysis);
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const attemptedCases = cases.filter(c => c.attempts && c.attempts.length > 0);

  if (attemptedCases.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.emptyState}>
            <h2>No Results Yet</h2>
            <p>Complete some case study practice questions to view your performance breakdown.</p>
            <div className={styles.emptyStateActions}>
              <button onClick={() => router.push("/history")} className={`${styles.actionButton} ${styles.secondaryButton}`}>Case History</button>
              <button onClick={() => router.push("/new-case")} className={`${styles.actionButton} ${styles.primaryButton}`}>Start New Case</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const totalQuestions = attemptedCases.reduce((acc, c) => acc + (c.attempts?.length || 0), 0);
  const totalCorrect = attemptedCases.reduce((acc, c) => acc + (c.attempts?.filter(a => a.isCorrect).length || 0), 0);
  
  const allFinalAttempts: any[] = [];
  attemptedCases.forEach(c => {
    const latestAttemptsMap = new Map();
    if (c.attempts) {
      c.attempts.forEach(a => latestAttemptsMap.set(a.questionId, a));
    }
    allFinalAttempts.push(...Array.from(latestAttemptsMap.values()));
  });

  const confidenceSummary = calculateConfidenceSummary(allFinalAttempts);
  const calibration = getConfidenceCalibration(confidenceSummary);
  
  // Aggregate concepts
  const conceptStats: Record<string, { total: number; correct: number; name: string }> = {};
  attemptedCases.forEach(c => {
    if (c.mcqs && c.attempts) {
      c.attempts.forEach(attempt => {
        const q = c.mcqs?.find(q => q.id === attempt.questionId);
        if (q && q.conceptTags && q.conceptTags.length > 0) {
          const concept = q.conceptTags[0];
          if (!conceptStats[concept.conceptId]) {
            conceptStats[concept.conceptId] = { total: 0, correct: 0, name: concept.conceptName };
          }
          conceptStats[concept.conceptId].total += 1;
          if (attempt.isCorrect) {
            conceptStats[concept.conceptId].correct += 1;
          }
        }
      });
    }
  });

  const conceptArray = Object.values(conceptStats).map(stat => ({
    ...stat,
    accuracy: Math.round((stat.correct / stat.total) * 100)
  })).sort((a, b) => b.total - a.total);

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const incorrectAttempts: any[] = [];
      attemptedCases.forEach(c => {
        if (c.mcqs && c.attempts) {
          c.attempts.filter(a => !a.isCorrect).forEach(a => {
            const q = c.mcqs?.find(q => q.id === a.questionId);
            if (q) {
              incorrectAttempts.push({
                question: q.stem,
                concept: q.conceptTags?.[0]?.conceptName,
                userAnswer: q.options?.find(o => o.id === a.selectedOptionId)?.text || "Unknown",
                correctAnswer: q.options?.find(o => o.id === q.correctOptionId || o.isCorrect)?.text || "Unknown",
                explanation: q.correctAnswerExplanation
              });
            }
          });
        }
      });

      const res = await fetch(getApiUrl('/api/generate-overall-analysis'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incorrectAttempts, conceptArray }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Failed to generate analysis: ${errData.details || res.statusText || 'Unknown error'}`);
      }
      
      const data = await res.json();
      setGlobalAnalysis(data.report);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.pageHeader}>
            <h1>Overall Results</h1>
            <p>Your performance across all case studies and concepts.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/report/results-summary" className={`${styles.actionButton} ${styles.secondaryButton}`}>
              Print Summary
            </Link>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Cases Attempted</span>
            <span className={styles.statValue}>{attemptedCases.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Average Score</span>
            <PieChart correct={totalCorrect} total={totalQuestions} size={100} />
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              <span className={styles.statValueAccent}>{totalCorrect}</span> / {totalQuestions}
            </span>
          </div>
        </div>

        <div className={styles.statsGrid} style={{ marginTop: '24px' }}>
          <div className={styles.statCard} style={{ gridColumn: '1 / -1', alignItems: 'flex-start', textAlign: 'left' }}>
            <span className={styles.statLabel} style={{ marginBottom: '20px' }}>Confidence Calibration</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', width: '100%', gap: '16px', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Responses</p>
                <p style={{ fontSize: '28px', fontWeight: '800' }}>{confidenceSummary.totalRecorded}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>High / Correct</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{confidenceSummary.correctHigh}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Low / Correct</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{confidenceSummary.correctLow}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>High / Error</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--error)' }}>{confidenceSummary.incorrectHigh}</p>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', width: '100%' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)', fontSize: '16px' }}>
                Classification: <span style={{ color: 'var(--accent-color)' }}>{calibration.classification}</span>
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{calibration.evidence}</p>
            </div>
          </div>
        </div>

        {conceptArray.length > 0 && (
          <>
            <h2 className={styles.sectionHeader}>Performance by Concept</h2>
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>Concept</div>
                <div>Questions</div>
                <div>Accuracy</div>
              </div>
              <div>
                {conceptArray.map((c, i) => (
                  <div key={i} className={styles.tableRow}>
                    <div className={styles.conceptName}>{c.name}</div>
                    <div className={styles.conceptCount}>{c.total}</div>
                    <div className={styles.conceptAccuracy}>
                      <span className={`${styles.accuracyBadge} ${c.accuracy >= 70 ? styles.accuracyHigh : c.accuracy >= 40 ? styles.accuracyMedium : styles.accuracyLow}`}>
                        {c.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {globalAnalysis ? (
          <div className={styles.aiAnalysisCard}>
            <div className={styles.aiHeader}>
              <div className={styles.aiIcon}>✨</div>
              <h2 className={styles.aiTitle}>AI Performance Analysis</h2>
            </div>
            <div className={styles.aiContent}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{globalAnalysis}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className={styles.generateSection}>
            <p>Want deeper insights? Generate a personalized AI analysis of your strengths and weaknesses based on your incorrect answers.</p>
            <button 
              onClick={handleGenerateAnalysis} 
              className={`${styles.actionButton} ${styles.primaryButton}`}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <><span className={styles.spinner} style={{marginRight: '8px'}}></span> Analyzing Performance...</>
              ) : (
                "Generate AI Analysis"
              )}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
