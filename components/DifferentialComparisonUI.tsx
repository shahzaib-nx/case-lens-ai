"use client";

import { LearnerDifferentialSubmission } from "@/lib/store";
import styles from "./DifferentialComparisonUI.module.css";
import ReactMarkdown from "react-markdown";

type DifferentialComparisonUIProps = {
  submission: LearnerDifferentialSubmission;
};

export function DifferentialComparisonUI({ submission }: DifferentialComparisonUIProps) {
  if (submission.status === "skipped") {
    return (
      <div className={styles.skippedBanner}>
        Differential exercise skipped.
      </div>
    );
  }

  const primary = submission.entries.find(e => e.role === "primary");
  const alternatives = submission.entries.filter(e => e.role === "alternative");

  return (
    <div className={styles.container}>
      <section className={styles.summarySection}>
        <h2 className={styles.sectionTitle}>Learner Differential Summary</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Most Likely Interpretation</h3>
            <p className={styles.interpretation}>{primary?.interpretation}</p>
            {primary?.supportingFindings.length ? (
              <div className={styles.findingList}>
                <strong>Supporting:</strong>
                <ul>{primary.supportingFindings.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            ) : null}
            {primary?.opposingFindings.length && primary.opposingFindings[0] !== "" ? (
              <div className={styles.findingList}>
                <strong>Opposing:</strong>
                <ul>{primary.opposingFindings.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            ) : null}
          </div>

          <div className={styles.summaryCard}>
            <h3>Alternatives Considered</h3>
            {alternatives.map((alt, idx) => (
              <div key={idx} className={styles.alternativeItem}>
                <p className={styles.interpretation}>{alt.interpretation}</p>
              </div>
            ))}
          </div>

          <div className={styles.summaryCardFull}>
            <h3>Most Influential Finding</h3>
            <p><strong>{submission.mostInfluentialFinding}</strong></p>
            <p className={styles.reason}>{submission.influentialFindingReason}</p>
          </div>
          
          <div className={styles.summaryCardFull}>
            <h3>Confidence</h3>
            <span className={styles.confidenceBadge} data-level={submission.confidence}>
              {submission.confidence} Confidence
            </span>
          </div>
        </div>
      </section>

      {submission.status === "comparison-pending" && (
        <div className={styles.pendingBanner}>
          <span className={styles.spinner} aria-hidden="true" />
          Comparing your reasoning with the educational analysis...
        </div>
      )}

      {submission.status === "comparison-failed" && (
        <div className={styles.failedBanner}>
          <h3>Differential comparison temporarily unavailable</h3>
          <p>Your differential and the educational analysis are saved. The automated comparison could not be generated at this time.</p>
          <div className={styles.manualPrompts}>
            <h4>Manual Comparison Prompts:</h4>
            <ul>
              <li>Which interpretations overlap?</li>
              <li>Which alternative did you miss?</li>
              <li>Which case clue did the analysis weight differently?</li>
              <li>Did you use relevant negative findings?</li>
              <li>Would you change your leading interpretation?</li>
            </ul>
          </div>
        </div>
      )}

      {submission.status === "comparison-complete" && submission.comparison && (
        <section className={styles.comparisonSection}>
          <h2 className={styles.sectionTitle}>Your Reasoning Compared with the Educational Analysis</h2>
          
          <div className={styles.comparisonCard}>
            <h3>Areas of Alignment</h3>
            <p>{submission.comparison.overlapSummary}</p>
            {submission.comparison.alignedReasoning.length > 0 && (
              <ul className={styles.feedbackList}>
                {submission.comparison.alignedReasoning.map((item, i) => (
                  <li key={i}><ReactMarkdown>{item}</ReactMarkdown></li>
                ))}
              </ul>
            )}
          </div>

          {submission.comparison.missingConsiderations.length > 0 && (
            <div className={styles.comparisonCard}>
              <h3>Relevant Alternatives You Did Not Include</h3>
              <ul className={styles.feedbackList}>
                {submission.comparison.missingConsiderations.map((item, i) => (
                  <li key={i}><ReactMarkdown>{item}</ReactMarkdown></li>
                ))}
              </ul>
            </div>
          )}

          {submission.comparison.unsupportedAssumptions.length > 0 && (
            <div className={styles.comparisonCard}>
              <h3>Unsupported or Weakly Supported Assumptions</h3>
              <ul className={styles.feedbackList}>
                {submission.comparison.unsupportedAssumptions.map((item, i) => (
                  <li key={i}><ReactMarkdown>{item}</ReactMarkdown></li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <h3>Evidence Use</h3>
              <ul className={styles.feedbackList}>
                {submission.comparison.evidenceUseAnalysis.map((item, i) => (
                  <li key={i}><ReactMarkdown>{item}</ReactMarkdown></li>
                ))}
              </ul>
            </div>

            {submission.comparison.localisationAnalysis && (
              <div className={styles.comparisonCard}>
                <h3>Localisation Analysis</h3>
                <p><ReactMarkdown>{submission.comparison.localisationAnalysis}</ReactMarkdown></p>
              </div>
            )}
            
            {submission.comparison.uncertaintyAnalysis && (
              <div className={styles.comparisonCard}>
                <h3>Handling of Uncertainty</h3>
                <p><ReactMarkdown>{submission.comparison.uncertaintyAnalysis}</ReactMarkdown></p>
                {submission.comparison.confidenceComment && <p className={styles.confidenceComment}><ReactMarkdown>{submission.comparison.confidenceComment}</ReactMarkdown></p>}
              </div>
            )}
          </div>

          <div className={`${styles.comparisonCard} ${styles.prioritiesCard}`}>
            <h3>Learning Priorities</h3>
            <ul className={styles.feedbackList}>
              {submission.comparison.learningPriorities.map((item, i) => (
                <li key={i}><ReactMarkdown>{item}</ReactMarkdown></li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
