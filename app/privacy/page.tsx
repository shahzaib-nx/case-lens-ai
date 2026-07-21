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
    if (
      await confirm({
        title: "Clear All Data",
        message:
          "Are you sure you want to clear ALL cases? This will permanently delete all your local data.",
        danger: true,
        confirmText: "Clear All Data",
      })
    ) {
      clearAllCases();
      await confirm({ title: "Success", message: "All local data has been cleared.", confirmText: "OK", hideCancel: true });
      router.push("/history");
    }
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.utilityRow}>
          <button onClick={() => router.back()} className={styles.backLink}>
            <span aria-hidden="true">←</span> Back
          </button>
          <Link href="/" className={styles.backLink}>
            Home
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <h1>Privacy Policy</h1>
          <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
            Last updated: {currentDate}
          </p>
        </header>

        {/* Compact Summary Block */}
        <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '24px', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <strong style={{ display: 'block', color: 'var(--accent-color)', fontSize: '1.1rem', marginBottom: '4px' }}>Stored in your browser</strong>
            <span style={{ color: 'var(--text-primary)' }}>Cases, attempts, scores, and learning history</span>
          </div>
          <div>
            <strong style={{ display: 'block', color: 'var(--accent-color)', fontSize: '1.1rem', marginBottom: '4px' }}>Sent for AI processing</strong>
            <span style={{ color: 'var(--text-primary)' }}>Only information required for requested AI generation</span>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#c75a5a', fontSize: '1.1rem', marginBottom: '4px' }}>Do not submit</strong>
            <span style={{ color: 'var(--text-primary)' }}>Patient-identifying or confidential information</span>
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.section}>
            <h2>Overview</h2>
            <p>
              CaseLens AI is an educational medical learning application developed for the ACT AI Final Course Project.
            </p>
            <p>This Privacy Notice explains:</p>
            <ul>
              <li>What information CaseLens AI processes</li>
              <li>Where information is stored</li>
              <li>When information is sent for AI processing</li>
              <li>Which external services may process technical or educational data</li>
              <li>How users can remove locally stored information</li>
              <li>The privacy limitations of the current prototype</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              CaseLens AI is intended only for fictional or properly de-identified educational case material.
            </p>
            <p>
              <strong>Do not submit identifiable patient information, confidential clinical records, or protected health information.</strong>
            </p>
          </div>

          <div className={styles.section}>
            <h2>Project Operator</h2>
            <p>CaseLens AI is operated by:</p>
            <p><strong>Shahzaib</strong></p>
            <p>Contact:</p>
            <p><strong>[PRIVACY CONTACT EMAIL]</strong></p>
            <p>This contact address should be used for questions about this Privacy Notice or the handling of information within CaseLens AI.</p>
          </div>

          <div className={styles.section}>
            <h2>Current Application Model</h2>
            <p>The current version of CaseLens AI:</p>
            <ul>
              <li>Does not require a user account</li>
              <li>Does not provide cloud synchronization</li>
              <li>Does not intentionally maintain a central learner-history database</li>
              <li>Stores learning records in the user's browser</li>
              <li>Uses server-side API routes for AI requests</li>
              <li>Uses Groq to generate educational content</li>
              <li>Is hosted through Vercel</li>
              <li>Is not designed to process real-patient information</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              This notice must be updated before adding accounts, cloud storage, uploads, analytics, payments, classroom features, or cross-device synchronization.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Information Stored in Your Browser</h2>
            <p>CaseLens AI may store the following information in the active browser profile:</p>
            <ul>
              <li>Educational case text entered by the user</li>
              <li>Generated case analyses</li>
              <li>Generated MCQs</li>
              <li>Answer options and explanations</li>
              <li>Practice sessions</li>
              <li>Selected answers</li>
              <li>Scores</li>
              <li>Confidence ratings</li>
              <li>Response times</li>
              <li>Question-review records</li>
              <li>Weak-concept summaries</li>
              <li>Adaptive-learning recommendations</li>
              <li>Saved history</li>
              <li>Application preferences</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              This information is currently stored through browser-based local storage.
            </p>
            <p>
              It is associated with the browser profile rather than a registered CaseLens AI account.
            </p>
          </div>

          <div className={styles.section}>
            <h2>What Local Storage Means</h2>
            <p>Locally stored information may:</p>
            <ul>
              <li>Remain available after the browser is closed</li>
              <li>Be accessible to another person using the same browser profile</li>
              <li>Be removed when browser data is cleared</li>
              <li>Be lost when the browser profile or device is reset</li>
              <li>Not appear on another browser or device</li>
              <li>Not be automatically backed up</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              Users should not rely on the current prototype as the only copy of important educational work.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Information Sent for AI Processing</h2>
            <p>
              When a user requests an AI-supported feature, relevant educational content is sent from the browser to a CaseLens AI server route and then to the configured AI provider.
            </p>
            <p>This may include:</p>
            <ul>
              <li>Submitted educational case text</li>
              <li>Selected difficulty</li>
              <li>Selected examination style</li>
              <li>Requested MCQ count</li>
              <li>Generated case-analysis context</li>
              <li>Target medical concept</li>
              <li>Requested adaptive-practice difficulty</li>
              <li>Limited aggregated performance information</li>
              <li>Other information required to complete the requested generation</li>
            </ul>
            <p style={{ marginTop: "16px" }}>Possible AI-supported functions include:</p>
            <ul>
              <li>Educational case analysis</li>
              <li>MCQ generation</li>
              <li>Answer explanations</li>
              <li>Distractor explanations</li>
              <li>Reasoning frameworks</li>
              <li>Differential comparison</li>
              <li>Progressive case stages</li>
              <li>Study-material generation</li>
              <li>Adaptive-review question generation</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              The application should send only the information needed for the requested operation.
            </p>
            <p>
              It should not send the user's complete saved history when a smaller, purpose-specific payload is sufficient.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Information That Must Not Be Submitted</h2>
            <div className={styles.warningBox}>
              <p style={{ color: 'inherit', marginBottom: '8px' }}>Do not enter:</p>
              <ul style={{ color: 'inherit', margin: 0, marginBottom: '16px' }}>
                <li>Patient names</li>
                <li>National identity numbers</li>
                <li>Passport numbers</li>
                <li>Medical record numbers</li>
                <li>Hospital registration numbers</li>
                <li>Phone numbers</li>
                <li>Email addresses</li>
                <li>Home addresses</li>
                <li>Identifiable photographs</li>
                <li>Unredacted clinical documents</li>
                <li>Exact dates or rare details that could identify a patient</li>
                <li>Passwords</li>
                <li>API keys</li>
                <li>Payment information</li>
                <li>Confidential institutional information</li>
                <li>Legally restricted medical material</li>
              </ul>
              <p style={{ color: 'inherit', marginBottom: 0 }}>
                Removing a patient's name alone may not make a case anonymous. A combination of diagnosis, location, date, occupation, or unusual circumstances may still identify someone.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Artificial Intelligence Provider</h2>
            <p>CaseLens AI currently uses Groq for AI-supported educational generation.</p>
            <p>
              Information included in an AI request may therefore be processed through Groq's services.
            </p>
            <p>
              Groq's handling of information depends on the service, product features, account configuration, and current data-control settings. Some Groq features require data retention to operate, and Groq publishes separate privacy, legal, and data-control documentation. Users should not assume that information sent to an external AI provider remains solely inside their browser.
            </p>
            <p>
              CaseLens AI must not claim that AI requests are never stored, never logged, or never retained unless that statement has been verified against the current Groq account configuration and contractual terms.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Hosting Provider</h2>
            <p>CaseLens AI is currently deployed using Vercel.</p>
            <p>
              As the hosting and infrastructure provider, Vercel may process technical information related to requests made to the deployed application. Its current privacy notice describes information such as IP addresses, log files, device or network activity, diagnostics, deployment metadata, performance information, and system configurations.
            </p>
            <p>
              This technical information is controlled in part by Vercel's services and policies rather than by browser-local CaseLens learning records.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Technical Information</h2>
            <p>Depending on the deployment configuration, technical information may be processed automatically when the application is accessed.</p>
            <p>This may include:</p>
            <ul>
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device type</li>
              <li>Operating system</li>
              <li>Request time</li>
              <li>Requested page or API route</li>
              <li>Error information</li>
              <li>Server logs</li>
              <li>Performance and diagnostic information</li>
              <li>Security-related request metadata</li>
            </ul>
            <p style={{ marginTop: "16px" }}>This information may be used for:</p>
            <ul>
              <li>Delivering the application</li>
              <li>Detecting errors</li>
              <li>Protecting the service</li>
              <li>Troubleshooting failed requests</li>
              <li>Monitoring performance</li>
              <li>Preventing misuse</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              The application must be audited before publishing a definitive list of technical logs and retention periods.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Cookies and Analytics</h2>
            <p>
              CaseLens AI does not intentionally use advertising cookies, behavioural tracking, or third-party marketing analytics.
            </p>
            <p>
              Browser storage is used to preserve local educational data and application settings.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Why Information Is Processed</h2>
            <p>CaseLens AI processes information to:</p>
            <ul>
              <li>Provide educational case analysis</li>
              <li>Generate case-specific MCQs</li>
              <li>Save local learning history</li>
              <li>Calculate scores</li>
              <li>Analyse confidence patterns</li>
              <li>Identify potential weak concepts</li>
              <li>Generate educational explanations</li>
              <li>Support Learning Mode and Exam Mode</li>
              <li>Produce printable learning reports</li>
              <li>Provide adaptive-practice recommendations</li>
              <li>Maintain application security and reliability</li>
              <li>Diagnose technical failures</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              Scoring, timer calculations, confidence totals, and adaptive rules are handled through deterministic application logic rather than being delegated entirely to the AI provider.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Legal Basis</h2>
            <p>
              The applicable legal basis depends on the user's location and the way CaseLens AI is made available.
            </p>
            <p>Possible legal bases may include:</p>
            <ul>
              <li>The user's request to provide the educational service</li>
              <li>Consent, where legally required</li>
              <li>Legitimate interests in operating, securing, and improving the application</li>
              <li>Compliance with legal obligations</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              This section should be reviewed by a qualified privacy professional before CaseLens AI becomes a public commercial service or begins processing account, institutional, health, or identifiable user data.
            </p>
            <p>
              Do not state that CaseLens AI is “GDPR compliant,” “HIPAA compliant,” or compliant with any other legal framework without a formal assessment and the required technical, contractual, and organizational controls.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Automated Analysis and Recommendations</h2>
            <p>CaseLens AI may automatically calculate:</p>
            <ul>
              <li>Scores</li>
              <li>Accuracy</li>
              <li>Confidence distributions</li>
              <li>Weak-concept classifications</li>
              <li>Difficulty recommendations</li>
              <li>Revision priorities</li>
              <li>Practice summaries</li>
            </ul>
            <p style={{ marginTop: "16px" }}>These outputs are educational indicators. They do not make decisions that determine:</p>
            <ul>
              <li>Employment</li>
              <li>Admission</li>
              <li>Certification</li>
              <li>Licensing</li>
              <li>Clinical privileges</li>
              <li>Insurance</li>
              <li>Healthcare access</li>
              <li>Legal rights</li>
              <li>Professional eligibility</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              Adaptive recommendations do not define a learner's permanent ability or clinical competence.
            </p>
            <p>
              Privacy notices should disclose automated decision-making where it has legal or similarly significant effects. CaseLens AI's current educational analytics should not be designed to produce such effects.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Data Sharing</h2>
            <p>CaseLens AI does not sell learner case histories or practice results.</p>
            <p>Information may be processed by service providers necessary to operate the application, including:</p>
            <ul>
              <li>Vercel, for hosting and server infrastructure</li>
              <li>Groq, for requested AI generation</li>
              <li>Any additional logging, monitoring, analytics, or error-reporting service actually enabled in the deployment</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              A complete production notice should list every external processor in use.
            </p>
            <p>
              Information may also be disclosed where legally required, such as in response to a valid legal process or regulatory obligation.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Data Retention</h2>
            <h3>Browser-local learning records</h3>
            <p>Locally stored cases, questions, attempts, and results remain in the browser until:</p>
            <ul>
              <li>The user deletes an individual case</li>
              <li>The user uses the Clear All function</li>
              <li>Browser data is cleared</li>
              <li>The browser profile is removed</li>
              <li>The application changes or migrates its local storage</li>
            </ul>
            <h3 style={{ marginTop: "16px" }}>Server and provider records</h3>
            <p>
              Temporary server logs, deployment logs, error records, and AI-provider records may follow the retention practices of the relevant infrastructure provider.
            </p>
            <p>The exact retention period must not be guessed. It should be verified from:</p>
            <ul>
              <li>The deployed Vercel configuration</li>
              <li>The Groq account and data-control configuration</li>
              <li>Any enabled analytics or monitoring service</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2>Deleting Your Local Data</h2>
            <p>Users can remove locally stored CaseLens data by:</p>
            <ul>
              <li>Deleting individual cases from Case History</li>
              <li>Using the application's Clear All History function</li>
              <li>Clearing site data through the browser's privacy settings</li>
            </ul>
            <p style={{ marginTop: "16px" }}>Clearing site data may permanently remove:</p>
            <ul>
              <li>Saved cases</li>
              <li>Practice attempts</li>
              <li>Scores</li>
              <li>Confidence history</li>
              <li>Generated questions</li>
              <li>Reports</li>
              <li>Learning analytics</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              The current prototype may not be able to restore deleted browser-local information.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Accessing or Correcting Information</h2>
            <p>
              Because the current version does not use registered user accounts or maintain a central learner database, the project operator may not be able to access, identify, correct, or restore information stored only inside a user's browser.
            </p>
            <p>Users can normally view their locally stored learning records through:</p>
            <ul>
              <li>Case History</li>
              <li>Case Results</li>
              <li>Overall Results</li>
              <li>Printable reports</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              Once cloud accounts or server-side storage are introduced, this section must be updated with formal procedures for access, correction, deletion, export, restriction, objection, and account closure.
            </p>
            <p>
              Privacy guidance commonly expects notices to describe applicable rights, such as access, correction, deletion, restriction, objection, and portability where those rights apply.
            </p>
          </div>

          <div className={styles.section}>
            <h2>International Processing</h2>
            <p>
              Vercel, Groq, or other service providers may process technical or AI-request information in countries other than the user's country.
            </p>
            <p>The applicable locations and safeguards depend on:</p>
            <ul>
              <li>Provider infrastructure</li>
              <li>Account settings</li>
              <li>Contractual arrangements</li>
              <li>Selected deployment region</li>
              <li>Applicable data-protection law</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              This section must be updated with verified transfer details before processing identifiable or sensitive information.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Medical and Sensitive Information</h2>
            <p>CaseLens AI is not intended to collect identifiable health information.</p>
            <p>Educational medical case content can still be sensitive even when submitted for study. Users must:</p>
            <ul>
              <li>Use fictional cases where possible</li>
              <li>Remove identifying details</li>
              <li>Avoid uploading clinical documents</li>
              <li>Avoid identifiable images</li>
              <li>Avoid real-patient records</li>
              <li>Obtain any necessary institutional permission before using restricted educational material</li>
            </ul>
            <p style={{ marginTop: "16px" }}>CaseLens AI should not be used as a patient-record system.</p>
          </div>

          <div className={styles.section}>
            <h2>Children's Privacy</h2>
            <p>
              CaseLens AI is intended for medical students, healthcare trainees, educators, and adult examination candidates.
            </p>
            <p>It is not intentionally designed to collect personal information from children.</p>
            <p>If access by minors is later supported, the project must introduce:</p>
            <ul>
              <li>An age policy</li>
              <li>Appropriate notices</li>
              <li>Consent or authorization controls where required</li>
              <li>Age-appropriate language</li>
              <li>Additional safeguards</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2>Data Security</h2>
            <p>Reasonable technical measures should be used to protect the application, including:</p>
            <ul>
              <li>Server-side API keys</li>
              <li>Input validation</li>
              <li>Output validation</li>
              <li>Restricted environment variables</li>
              <li>HTTPS deployment</li>
              <li>Request-size limits</li>
              <li>Error handling</li>
              <li>Dependency updates</li>
              <li>Access controls for future cloud data</li>
              <li>Private storage for future restricted resources</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              However, no browser storage, server, network, or external AI service can be guaranteed completely secure.
            </p>
            <p>
              Users should not submit information that CaseLens AI is not designed to protect.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Links to Other Websites</h2>
            <p>CaseLens AI may link to:</p>
            <ul>
              <li>Medical resources</li>
              <li>Source documents</li>
              <li>Vercel</li>
              <li>Groq</li>
              <li>External reference material</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              External websites operate under their own privacy notices and terms. CaseLens AI is not responsible for the privacy practices of unrelated external websites.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Changes to This Privacy Notice</h2>
            <p>This Privacy Notice may be updated when the application changes. Significant changes may include:</p>
            <ul>
              <li>User accounts</li>
              <li>Cloud synchronization</li>
              <li>Server-side history</li>
              <li>File uploads</li>
              <li>Medical-resource storage</li>
              <li>Analytics</li>
              <li>Error monitoring</li>
              <li>New AI providers</li>
              <li>Classroom or institutional features</li>
              <li>Payment processing</li>
              <li>Mobile applications</li>
            </ul>
            <p style={{ marginTop: "16px" }}>
              The updated notice should show a new effective date. Material changes should be communicated clearly within the application when practical.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Contact</h2>
            <p>Questions or concerns about privacy may be sent to:</p>
            <p><strong>Shahzaib</strong></p>
            <p><strong>Email:</strong> [PRIVACY CONTACT EMAIL]</p>
            <p style={{ marginTop: "16px" }}>
              Include enough information to explain the request, but do not send patient records, passwords, API keys, or other sensitive material by email.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Final Privacy Reminder</h2>
            <div style={{ backgroundColor: 'var(--accent-color)', color: '#fff', padding: '24px', borderRadius: '12px', marginTop: '16px' }}>
              <p style={{ color: 'inherit', margin: 0, fontWeight: 700, fontSize: '1.2rem', marginBottom: '12px' }}>CaseLens AI is a local-first educational prototype, not a confidential patient-record system.</p>
              <ul style={{ color: 'inherit', margin: 0, marginBottom: '12px' }}>
                <li style={{ marginBottom: '8px' }}>Use fictional or properly de-identified cases.</li>
                <li>Do not submit information that identifies a real patient.</li>
              </ul>
              <p style={{ color: 'inherit', margin: 0, lineHeight: '1.6' }}>
                Information used for AI generation may leave the browser and be processed by external infrastructure and AI providers.
              </p>
            </div>
          </div>

          <div className={styles.footerActions}>
            <button
              onClick={handleClearAll}
              className={`${styles.actionButton} ${styles.dangerButton}`}
            >
              Clear All My Data
            </button>
            <Link
              href="/safety"
              className={`${styles.actionButton} ${styles.secondaryButton}`}
            >
              Review Safety Guidelines
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
