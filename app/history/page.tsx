"use client";

import { useCaseStore, CaseStudy, isDifferentialBuilderEnabled, getCaseFormat, getPracticeSessions } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./history.module.css";
import { useConfirm } from "@/components/ConfirmProvider";

function getDifferentialStatusLabel(c: CaseStudy): string | null {
  if (!isDifferentialBuilderEnabled(c)) return null;
  if (c.differentialSubmission?.status === "skipped") return "Differential Skipped";
  if (c.differentialSubmission?.status === "comparison-complete") return "Comparison Ready";
  if (c.differentialSubmission?.status === "comparison-pending") return "Comparison Pending";
  if (c.differentialSubmission?.status === "comparison-failed") return "Comparison Failed";
  if (c.differentialDraft) return "Differential Draft";
  return "Differential Not Started";
}

function getProgressiveStatusLabel(c: CaseStudy): string | null {
  if (getCaseFormat(c) !== "progressive") return null;
  if (!c.progressiveSession) return "Progressive Available";
  if (c.progressiveSession.status === "completed") return "Progressive Complete";
  if (c.progressiveSession.status === "skipped") return "Progressive Skipped";
  if (c.progressiveSession.status === "in-progress") {
    return `Stage ${c.progressiveSession.currentStageIndex + 1} of ${c.progressiveCase?.stages.length || "?"}`;
  }
  return "Progressive Reveal";
}

function getPracticeSessionLabel(c: CaseStudy): string | null {
  const sessions = getPracticeSessions(c);
  if (sessions.length === 0) return null;
  const latest = sessions[sessions.length - 1];
  
  const mode = latest.purpose === "adaptive-review" ? "Adaptive Review" 
             : latest.mode === "exam" ? "Exam Mode" : "Learning Mode";
             
  if (latest.status === "completed") return `${mode} (Completed)`;
  if (latest.status === "expired") return `${mode} (Expired)`;
  if (latest.status === "in-progress") return `${mode} (In Progress)`;
  return null;
}

export default function CaseHistory() {
  const router = useRouter();
  const { cases, deleteCase, clearAllCases } = useCaseStore();
  const [mounted, setMounted] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigating to the case if clicking delete
    if (await confirm({ title: "Delete Case", message: "Are you sure you want to delete this case?", danger: true, confirmText: "Delete" })) {
      deleteCase(id);
    }
  };

  const handleClearAll = async () => {
    if (await confirm({ title: "Clear All Cases", message: "Are you sure you want to clear ALL cases? This cannot be undone.", danger: true, confirmText: "Clear All" })) {
      clearAllCases();
    }
  };

  return (
    <main className={styles.page}>
      <section className="container">
        <div className={styles.headerRow}>
          <div className={styles.pageHeader}>
            <h1>Case History</h1>
            <p>Review and analyze your previously saved cases.</p>
          </div>
          <div className={styles.headerActions}>
            {cases.length > 0 && (
              <button onClick={handleClearAll} className={`${styles.actionButton} ${styles.dangerButton}`}>
                Clear All
              </button>
            )}
            <Link href="/new-case" className={`${styles.actionButton} ${styles.primaryButton}`}>
              Start New Case
            </Link>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <h2>No cases found</h2>
            <p>You haven't saved any clinical cases yet. Start a new case to begin your educational analysis.</p>
            <Link href="/new-case" className={`${styles.actionButton} ${styles.primaryButton}`}>
              Start Your First Case
            </Link>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {cases.map((c) => (
              <Link href={`/case?id=${c.id}`} key={c.id} className={`card card-interactive ${styles.caseCard}`}>
                <div className={styles.caseHeader}>
                  <h3 className={styles.caseTitle}>{c.title || "Untitled Case"}</h3>
                  <span className={styles.caseDate}>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                
                <p className={styles.casePreview}>{c.content}</p>

                <div className={styles.caseFooter}>
                  <div className={styles.badges}>
                    {c.difficulty && <span className={`${styles.badge} ${styles.badgeDifficulty}`}>{c.difficulty}</span>}
                    {c.analysis && <span className={`${styles.badge} ${styles.badgeStatus}`}>Analyzed</span>}
                    
                    {getProgressiveStatusLabel(c) && (
                      <span className={`${styles.badge} ${styles.badgeStatus}`} style={{ background: 'var(--nav-bg)', color: 'var(--accent-color)' }}>
                        {getProgressiveStatusLabel(c)}
                      </span>
                    )}

                    {getDifferentialStatusLabel(c) && getCaseFormat(c) !== "progressive" && (
                      <span className={`${styles.badge} ${styles.badgeStatus}`} style={{ background: 'var(--nav-bg)', color: 'var(--text-secondary)' }}>
                        {getDifferentialStatusLabel(c)}
                      </span>
                    )}
                    
                    {getPracticeSessionLabel(c) && (
                      <span className={`${styles.badge} ${styles.badgeStatus}`} style={{ background: 'var(--nav-bg)', color: 'var(--success)' }}>
                        {getPracticeSessionLabel(c)}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, c.id)} 
                    className={styles.deleteButton}
                    aria-label={`Delete ${c.title}`}
                  >
                    Delete
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
