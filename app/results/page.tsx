"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import PieChart from "@/components/PieChart";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiUrl } from "@/lib/api-client";
import { aggregateOverallResults } from "@/lib/results/aggregateOverallResults";
import { sortWeakConcepts } from "@/lib/results/sortWeakConcepts";
import styles from "./results.module.css";
import { useConfirm } from "@/components/ConfirmProvider";

export default function OverallResults() {
  const router = useRouter();
  const cases = useCaseStore((state) => state.cases);
  const globalAnalysis = useCaseStore((state) => state.globalAnalysis);
  const setGlobalAnalysis = useCaseStore((state) => state.setGlobalAnalysis);
  const createPracticeSession = useCaseStore((state) => state.createPracticeSession);

  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStartingAdaptive, setIsStartingAdaptive] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Aggregate results using pure logic function
  const { summary, allConcepts } = aggregateOverallResults({ cases });

  if (summary.uniqueCases === 0) {
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

  // Filter and sort weak concepts
  const weakClassifications = ["possible-weakness", "emerging-weakness", "consistent-weakness"];
  const weakConcepts = sortWeakConcepts(
    allConcepts.filter(c => weakClassifications.includes(c.classification))
  );

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(getApiUrl('/api/generate-overall-analysis'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          weakConcepts: weakConcepts.map(c => ({
            conceptId: c.conceptId,
            conceptLabel: c.conceptLabel,
            totalAnswered: c.totalAnswered,
            errorCount: c.errorCount,
            highConfidenceErrorCount: c.highConfidenceErrorCount,
            accuracyPercentage: c.accuracyPercentage,
            classification: c.classification
          }))
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Failed to generate analysis: ${errData.details || res.statusText || 'Unknown error'}`);
      }
      
      const data = await res.json();
      setGlobalAnalysis(data.report);
      
    } catch (error: any) {
      console.error(error);
      await confirm({ title: "Analysis Failed", message: error.message, confirmText: "OK", hideCancel: true });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchAdaptive = async (conceptId: string, decisionId: string) => {
    if (isStartingAdaptive) return;
    setIsStartingAdaptive(true);
    try {
      const cse = cases.find(c => c.adaptiveDecisions?.some(d => d.id === decisionId));
      if (!cse) throw new Error("Could not find the case associated with this adaptive review.");
      const decision = cse.adaptiveDecisions?.find(d => d.id === decisionId);
      if (!decision) throw new Error("Could not find the adaptive decision record.");
      const sessionId = createPracticeSession(cse.id, "learning", { mode: "none" }, "adaptive-review", { 
        conceptId: decision.conceptId,
        targetDifficulty: decision.recommendedDifficulty,
        questionPurpose: decision.purpose,
        sourceDecisionId: decisionId 
      });
      router.push(`/case/practice?id=${cse.id}&sessionId=${sessionId}`);
    } catch (e: any) {
      await confirm({ title: "Error", message: e.message, confirmText: "OK", hideCancel: true });
      setIsStartingAdaptive(false);
    }
  };

  const formatClassification = (cls: string) => {
    return cls.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getAccuracyBadgeClass = (accuracy: number) => {
    if (accuracy >= 70) return styles.accuracyHigh;
    if (accuracy >= 40) return styles.accuracyMedium;
    return styles.accuracyLow;
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

        {/* Overall Combined Summary */}
        <div className={`${styles.statsGrid} ${styles.fourCol}`}>
          <div className={`${styles.statCard} ${styles.span2}`}>
            <div>
              <span className={styles.statLabel} style={{ display: 'block' }}>Cases Attempted</span>
              <span className={styles.statValue} style={{ fontSize: '32px' }}>{summary.uniqueCases}</span>
            </div>
            <div>
              <span className={styles.statLabel} style={{ display: 'block' }}>Tests Completed</span>
              <span className={styles.statValue} style={{ fontSize: '32px' }}>{summary.completedTests}</span>
            </div>
          </div>
          
          <div className={`${styles.statCard} ${styles.span2}`}>
            <div>
              <span className={styles.statLabel} style={{ display: 'block' }}>Questions Solved</span>
              <span className={styles.statValue} style={{ fontSize: '32px' }}>{summary.answeredQuestions}</span>
            </div>
            <div>
              <span className={styles.statLabel} style={{ display: 'block' }}>Unanswered</span>
              <span className={styles.statValue} style={{ fontSize: '32px' }}>{summary.unanswered}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Overall Score</span>
            <PieChart correct={summary.correct} total={summary.totalQuestions} size={100} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>Includes Unanswered</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Overall Accuracy</span>
            <div style={{ display: 'flex', alignItems: 'center', height: '100px' }}>
              <span className={styles.statValue}>{Math.round(summary.answeredAccuracy * 100)}%</span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>Answered Only</span>
          </div>
          <div className={styles.statCard}>
             <span className={styles.statLabel}>Score Values</span>
            <span className={styles.statValue} style={{ display: 'flex', alignItems: 'center', height: '100px' }}>
              <span className={styles.statValueAccent}>{summary.correct}</span><span style={{fontSize: '24px', margin: '0 8px'}}>/</span><span style={{fontSize: '32px'}}>{summary.totalQuestions}</span>
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>({summary.incorrect} Incorrect)</span>
          </div>
        </div>

        {/* Confidence Calibration */}
        <div className={`${styles.statsGrid} ${styles.oneCol}`}>
          <div className={`${styles.statCard} ${styles.alignStart}`}>
            <span className={styles.statLabel} style={{ marginBottom: '20px' }}>Confidence Calibration</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', width: '100%', gap: '16px', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Confidence Recorded</p>
                <p style={{ fontSize: '28px', fontWeight: '800' }}>{summary.confidenceRecordedCount} <span style={{fontSize:'14px', fontWeight:'normal', color: 'var(--text-secondary)'}}>of {summary.answeredQuestions}</span></p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Confidence Not Recorded</p>
                <p style={{ fontSize: '28px', fontWeight: '800' }}>{summary.confidenceNotRecorded}</p>
              </div>
              
              <div style={{gridColumn: '1 / -1', height: '1px', background: 'var(--card-border)', margin: '8px 0'}}></div>
              
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>High / Correct</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{summary.highConfidenceCorrect}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Moderate / Correct</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{summary.moderateConfidenceCorrect}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Low / Correct</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{summary.lowConfidenceCorrect}</p>
              </div>
              
              <div style={{gridColumn: '1 / -1', height: '1px', background: 'var(--card-border)', margin: '8px 0'}}></div>

              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>High / Error</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--error)' }}>{summary.highConfidenceError}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Moderate / Error</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--error)' }}>{summary.moderateConfidenceError}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Low / Error</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--error)' }}>{summary.lowConfidenceError}</p>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', width: '100%' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-primary)', fontSize: '16px' }}>
                Classification: <span style={{ color: 'var(--accent-color)' }}>
                  {summary.highConfidenceError > summary.lowConfidenceError && summary.highConfidenceError > 3 ? "Overconfident error pattern" : 
                   summary.lowConfidenceCorrect > summary.highConfidenceCorrect && summary.lowConfidenceCorrect > 3 ? "Underconfident pattern" : 
                   summary.confidenceRecordedCount > 5 ? "Mixed / Neutral pattern" : "Insufficient data"}
                </span>
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                 Derived from {summary.confidenceRecordedCount} confidence-recorded responses across all tests.
              </p>
            </div>
          </div>
        </div>

        {/* Master Weak Concepts */}
        <h2 className={styles.sectionHeader}>Master Weak Concepts</h2>
        <div className={styles.tableCard}>
          {weakConcepts.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', padding: '20px 0', textAlign: 'center'}}>No consistent weaknesses identified across tests.</p>
          ) : (
            <>
              <div className={styles.tableHeader} style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.5fr 2fr', paddingRight: '12px' }}>
                <div style={{textAlign: 'left'}}>Concept</div>
                <div style={{textAlign: 'center'}}>Errors</div>
                <div style={{textAlign: 'center'}}>Questions Solved</div>
                <div style={{textAlign: 'center'}}>Accuracy</div>
                <div style={{textAlign: 'center'}}>High-Conf Errors</div>
                <div style={{textAlign: 'left', paddingLeft: '12px'}}>Classification</div>
              </div>
              <div>
                {weakConcepts.map((c, i) => (
                  <div key={i} className={styles.tableRow} style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.5fr 2fr' }}>
                    <div className={styles.conceptName}>{c.conceptLabel}</div>
                    <div className={styles.conceptCount} style={{color: 'var(--error)', fontWeight: 'bold'}}>
                      <span className={styles.mobileLabel}>Errors:</span>
                      {c.errorCount}
                    </div>
                    <div className={styles.conceptCount}>
                      <span className={styles.mobileLabel}>Questions Solved:</span>
                      {c.totalAnswered}
                    </div>
                    <div className={styles.conceptAccuracy} style={{justifyContent: 'center'}}>
                      <span className={styles.mobileLabel}>Accuracy:</span>
                      <span className={`${styles.accuracyBadge} ${getAccuracyBadgeClass(c.accuracyPercentage)}`}>
                        {c.accuracyPercentage}%
                      </span>
                    </div>
                    <div className={styles.conceptCount} style={{color: c.highConfidenceErrorCount > 0 ? 'var(--error)' : 'inherit'}}>
                      <span className={styles.mobileLabel}>High-Conf Errors:</span>
                      {c.highConfidenceErrorCount}
                    </div>
                    <div style={{fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '12px'}}>
                      <span className={styles.mobileLabel}>Classification:</span>
                      {formatClassification(c.classification)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Complete Performance by Concept */}
        <h2 className={styles.sectionHeader} style={{marginTop: '48px'}}>Complete Performance by Concept</h2>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 1fr 2fr', paddingRight: '12px' }}>
            <div style={{textAlign: 'left'}}>Concept</div>
            <div style={{textAlign: 'center'}}>Correct</div>
            <div style={{textAlign: 'center'}}>Errors</div>
            <div style={{textAlign: 'center'}}>Total Solved</div>
            <div style={{textAlign: 'center'}}>Accuracy</div>
            <div style={{textAlign: 'left', paddingLeft: '24px'}}>Status</div>
          </div>
          <div>
            {allConcepts.map((c, i) => (
              <div key={i} className={styles.tableRow} style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 1fr 2fr' }}>
                <div className={styles.conceptName}>{c.conceptLabel}</div>
                <div className={styles.conceptCount} style={{color: 'var(--success)'}}>
                  <span className={styles.mobileLabel}>Correct:</span>
                  {c.correctCount}
                </div>
                <div className={styles.conceptCount} style={{color: c.errorCount > 0 ? 'var(--error)' : 'inherit'}}>
                  <span className={styles.mobileLabel}>Errors:</span>
                  {c.errorCount}
                </div>
                <div className={styles.conceptCount}>
                  <span className={styles.mobileLabel}>Total Solved:</span>
                  {c.totalAnswered}
                </div>
                <div className={styles.conceptAccuracy} style={{justifyContent: 'center'}}>
                  <span className={styles.mobileLabel}>Accuracy:</span>
                  <span className={`${styles.accuracyBadge} ${getAccuracyBadgeClass(c.accuracyPercentage)}`}>
                    {c.accuracyPercentage}%
                  </span>
                </div>
                <div style={{fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '24px'}}>
                  <span className={styles.mobileLabel}>Status:</span>
                  {formatClassification(c.classification)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight */}
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
