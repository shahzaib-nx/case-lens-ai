"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../info.module.css";

export default function AboutSafety() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.utilityRow}>
          <button onClick={() => router.back()} className={styles.backLink}>
            <span aria-hidden="true">←</span> Back
          </button>
          <Link href="/" className={styles.backLink}>Home</Link>
        </div>

        <header className={styles.pageHeader}>
          <h1>About & Safety</h1>
        </header>
        
        <div className={styles.contentCard}>
          <div className={styles.section}>
            <h2>What is CaseLens AI?</h2>
            <p>
              CaseLens AI is an educational tool designed for medical students and professionals to analyze clinical case studies and test their knowledge. It uses advanced AI to break down complex cases and generate multiple-choice questions.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Safety First</h2>
            <p>
              <strong>Not for Diagnostic Use:</strong> CaseLens AI is strictly an educational tool. It is <strong>NOT</strong> intended for diagnosing or treating real patients. Never upload actual patient data or use the AI's analysis to make medical decisions.
            </p>
            <p>
              <strong>Data Privacy:</strong> Please ensure that all case studies you input are fully anonymized. Do not include names, exact dates, specific locations, or any other Personally Identifiable Information (PII).
            </p>
          </div>

          <div className={styles.section}>
            <h2>How it Works</h2>
            <ul>
              <li><strong>Local Storage:</strong> All your cases, analysis, and scores are stored locally in your browser. Nothing is saved to a central database.</li>
              <li><strong>AI Analysis:</strong> When you analyze a case, the text is sent securely to the AI model, processed, and the result is returned directly to you.</li>
              <li><strong>Offline Mode:</strong> You can view your saved history offline, but new AI requests require an internet connection.</li>
            </ul>
          </div>

          <div className={styles.footerActions}>
            <Link href="/privacy" className={`${styles.actionButton} ${styles.secondaryButton}`}>Read Privacy Policy</Link>
            <Link href="/new-case" className={`${styles.actionButton} ${styles.primaryButton}`}>Start New Case</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
