import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.backgroundDecoration} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroBrand}>
            <span className={styles.heroLogoMark} aria-hidden="true">
              C
            </span>

            <span>CaseLens AI</span>
          </div>

          <h1 className={styles.heading}>
            Practise clinical reasoning
            <br />
            with every case
          </h1>

          <p className={styles.description}>
            Analyse educational clinical cases, practise case-specific
            questions, and understand why every answer is correct or incorrect.
          </p>

          <div className={styles.actions}>
            <Link href="/new-case" className={styles.primaryButton}>
              Start New Case
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>

            <Link href="/about" className={styles.secondaryButton}>
              Explore How It Works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
