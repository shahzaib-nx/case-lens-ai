"use client";

import { useCaseStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../info.module.css";
import { useConfirm } from "@/components/ConfirmProvider";

export default function PrivacyPolicy() {
  const router = useRouter();
  const { clearAllCases } = useCaseStore();
  const [mounted, setMounted] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleClearAll = async () => {
    if (await confirm({ title: "Clear All Data", message: "Are you sure you want to clear ALL cases? This will permanently delete all your local data.", danger: true, confirmText: "Clear All Data" })) {
      clearAllCases();
      alert("All local data has been cleared.");
      router.push("/history");
    }
  };

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
          <h1>Privacy Policy</h1>
        </header>
        
        <div className={styles.contentCard}>
          <div className={styles.section}>
            <h2>No User Accounts or Cloud History</h2>
            <p>
              CaseLens AI does not require you to sign up, log in, or create a profile. We do not store your case history, analysis, or quiz scores on any cloud servers or databases. 
            </p>
          </div>

          <div className={styles.section}>
            <h2>Local Storage Architecture</h2>
            <p>
              All data you generate within the application is stored <strong>locally on your device</strong> using your browser's local storage mechanism. This means you have full control over your data. If you clear your browser data or use a different browser, your history will not be available.
            </p>
          </div>

          <div className={styles.section}>
            <h2>AI Processing</h2>
            <p>
              To generate the analysis and multiple-choice questions, the text you submit is sent securely via an API to the AI service (Groq). The text is processed solely for the purpose of generating the requested educational content and is not retained by CaseLens AI.
            </p>
            <p>
              When the Differential Builder feature is used, the learner's educational reasoning and relevant case context are sent through the application's AI-processing workflow to generate the comparison.
            </p>
            <p>
              When the Progressive Case Reveal feature is used, progressive stage data is generated via the AI workflow but your stage-by-stage reasoning is primarily stored locally, unless explicitly incorporated into the later differential comparison workflow.
            </p>
            <div className={styles.warningBox}>
              <p>Reminder: Do not submit Personally Identifiable Information (PII) or real patient data.</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Data Management</h2>
            <ul>
              <li>You can delete individual cases from the Case History page.</li>
              <li>You can clear all local data entirely using the button below.</li>
            </ul>
          </div>

          <div className={styles.footerActions}>
            <button onClick={handleClearAll} className={`${styles.actionButton} ${styles.dangerButton}`}>Clear All My Data</button>
            <Link href="/about" className={`${styles.actionButton} ${styles.secondaryButton}`}>About & Safety</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
