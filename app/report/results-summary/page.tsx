"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { calculateConfidenceSummary, getConfidenceCalibration } from "@/lib/confidenceUtils";
import styles from "./report.module.css";

export default function ResultsSummary() {
  const router = useRouter();
  const cases = useCaseStore((state) => state.cases);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const completedCases = cases.filter(c => c.score !== undefined && (c.mcqs || c.questions));

  const handlePrint = () => window.print();

  if (completedCases.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div style={{ textAlign: 'center', padding: '40px' }}>No completed cases.</div>
        </section>
      </main>
    );
  }

  const totalQuestions = completedCases.reduce((acc, c) => acc + ((c.mcqs || c.questions)?.length || 0), 0);
  const totalCorrect = completedCases.reduce((acc, c) => acc + (c.score || 0), 0);
  const averagePercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const allFinalAttempts: any[] = [];
  completedCases.forEach(c => {
    const latestAttemptsMap = new Map();
    if (c.attempts) {
      c.attempts.forEach(a => latestAttemptsMap.set(a.questionId, a));
    }
    allFinalAttempts.push(...Array.from(latestAttemptsMap.values()));
  });

  const confidenceSummary = calculateConfidenceSummary(allFinalAttempts);
  const calibration = getConfidenceCalibration(confidenceSummary);

  return (
    <main className={styles.page}>
      <section className={`container ${styles.reportCard}`}>
        <div className={styles.utilityRow}>
          <button onClick={() => router.back()} className="btn-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <button onClick={handlePrint} className="btn btn-print">
            Print / Save PDF
          </button>
        </div>

        <header className={styles.pageHeader}>
          <h1>Overall Results Summary</h1>
          <p>CaseLens AI</p>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Score</p>
            <div className={styles.statValue}>{totalCorrect} / {totalQuestions}</div>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Average</p>
            <div className={styles.statValue}>{averagePercentage}%</div>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Cases Completed</p>
            <div className={styles.statValue}>{completedCases.length}</div>
          </div>
        </div>

        {allFinalAttempts.length > 0 && (
          <section className={styles.breakdownSection} style={{ marginTop: '32px' }}>
            <h2>Confidence Calibration</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Responses</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{confidenceSummary.totalRecorded}</p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px' }}>High / Correct</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{confidenceSummary.correctHigh}</p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px' }}>Low / Correct</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{confidenceSummary.correctLow}</p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 700, letterSpacing: '0.5px' }}>High / Error</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--error)' }}>{confidenceSummary.incorrectHigh}</p>
              </div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'rgba(37,99,235,0.05)', borderRadius: '12px', border: '1px solid rgba(37,99,235,0.2)' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)', fontSize: '16px' }}>
                Classification: <span style={{ color: 'var(--accent-color)' }}>{calibration.classification}</span>
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{calibration.evidence}</p>
            </div>
          </section>
        )}

        <section className={styles.breakdownSection}>
          <h2>Breakdown by Case</h2>
          <div>
            {completedCases.map((c, idx) => {
              const qCount = (c.mcqs || c.questions)!.length;
              const percent = qCount > 0 ? Math.round(((c.score || 0) / qCount) * 100) : 0;
              return (
                <div key={c.id} className={styles.caseRow}>
                  <div className={styles.caseInfo}>
                    <h3>{idx + 1}. {c.title || "Untitled Case"}</h3>
                    <p>Completed: {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className={styles.caseScore}>
                    <div className={styles.scoreFraction}>
                      {c.score} / {qCount}
                    </div>
                    <div className={styles.scorePercent}>
                      {percent}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        
        <footer className={styles.footer}>
          Printed on {new Date().toLocaleDateString()}. This report was generated locally and securely by CaseLens AI.
        </footer>
      </section>
    </main>
  );
}
