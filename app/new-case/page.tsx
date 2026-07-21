"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./new-case.module.css";
import { useCaseStore } from "@/lib/store";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { getApiUrl } from "@/lib/api-client";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";

type Difficulty = "Basic" | "Intermediate" | "Advanced";
type ExamStyle = "General" | "NRE" | "USMLE" | "PLAB" | "MRCP";
type QuestionCount = 3 | 5 | 10;

const MIN_CASE_LENGTH = 80;
const MAX_CASE_LENGTH = 12_000;

const exampleCases = [
  {
    title: "Sudden Right-Sided Weakness",
    content:
      "A 62-year-old man presents 45 minutes after developing sudden right-sided facial weakness, right arm weakness, and difficulty speaking. He has a history of hypertension and type 2 diabetes mellitus. On examination, he is alert but has expressive aphasia, right lower facial weakness, and reduced power in the right upper limb. There is no history of trauma, seizure, fever, or severe headache.",
  },
  {
    title: "Chest Pain During Exertion",
    content:
      "A 55-year-old man presents with central chest pressure that began while climbing stairs. The pain radiates to his left arm and improves after resting. He has hypertension, hyperlipidaemia, and a 20-pack-year smoking history. Examination is currently unremarkable. He denies fever, cough, pleuritic pain, or recent trauma.",
  },
  {
    title: "Progressive Fatigue and Weight Loss",
    content:
      "A 38-year-old woman presents with three months of fatigue, weight loss, palpitations, heat intolerance, and increased sweating. Examination shows a fine tremor, resting tachycardia, and a diffusely enlarged non-tender thyroid gland. She has no recent infection and is not taking thyroid medication.",
  },
];

export default function NewCasePage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [caseContent, setCaseContent] = useState("");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("Intermediate");
  const [examStyle, setExamStyle] = useState<ExamStyle>("General");
  const [questionCount, setQuestionCount] =
    useState<QuestionCount>(5);
  const [differentialBuilderEnabled, setDifferentialBuilderEnabled] = 
    useState<boolean>(true);
  const [caseFormat, setCaseFormat] = useState<"complete" | "progressive">("complete");

  const [practiceMode, setPracticeMode] = useState<"learning" | "exam">("learning");
  const [timerMode, setTimerMode] = useState<"none" | "per-question" | "total">("none");
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(60);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState(20);
  const [adaptiveDifficultyEnabled, setAdaptiveDifficultyEnabled] = useState(true);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const characterCount = caseContent.length;

  const validationMessage = useMemo(() => {
    if (!submitAttempted && characterCount === 0) {
      return "";
    }

    if (characterCount === 0) {
      return "Enter an educational case narrative.";
    }

    if (characterCount < MIN_CASE_LENGTH) {
      return `Add at least ${
        MIN_CASE_LENGTH - characterCount
      } more characters so the case can be analysed meaningfully.`;
    }

    if (characterCount > MAX_CASE_LENGTH) {
      return `Remove ${
        characterCount - MAX_CASE_LENGTH
      } characters before continuing.`;
    }

    return "";
  }, [characterCount, submitAttempted]);

  const isCaseValid =
    characterCount >= MIN_CASE_LENGTH &&
    characterCount <= MAX_CASE_LENGTH;

  function generateRandomCase() {
    const randomCase =
      exampleCases[Math.floor(Math.random() * exampleCases.length)];

    setTitle(randomCase.title);
    setCaseContent(randomCase.content);
    setSubmitAttempted(false);
  }

  function resetForm() {
    setTitle("");
    setCaseContent("");
    setDifficulty("Intermediate");
    setExamStyle("General");
    setQuestionCount(5);
    setDifferentialBuilderEnabled(true);
    setCaseFormat("complete");
    setPracticeMode("learning");
    setTimerMode("none");
    setSecondsPerQuestion(60);
    setTotalDurationMinutes(20);
    setSubmitAttempted(false);
    setShowResetDialog(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!isCaseValid) {
      if (validationMessage) toast(validationMessage, "error");
      return;
    }
    
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Hit the analysis API
      const res = await fetch(getApiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: caseContent.trim(), caseFormat }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      let progressiveCase = data.progressiveCase || null;
      let progressiveGenerationStatus = data.progressiveGenerationStatus || "not-requested";

      if (caseFormat === "progressive" && data.isValid) {
        try {
          const progRes = await fetch(getApiUrl("/api/generate-progressive-case"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: caseContent.trim() }),
          });
          const progData = await progRes.json();
          if (progRes.ok && progData.progressiveGenerationStatus === "ready") {
            progressiveCase = progData.progressiveCase;
            progressiveGenerationStatus = "ready";
          } else {
            progressiveGenerationStatus = "failed";
          }
        } catch (error) {
          console.error("Failed to generate progressive case separately:", error);
          progressiveGenerationStatus = "failed";
        }
      } else if (caseFormat === "progressive") {
        progressiveGenerationStatus = "failed";
      }

      // 2. Save the local case record using Zustand
      const caseId = crypto.randomUUID();
      const actualFormat = progressiveGenerationStatus === "failed" ? "complete" : caseFormat;
      
      const caseRecord = {
        id: caseId,
        title: title.trim() || "Untitled Educational Case",
        content: caseContent.trim(),
        difficulty,
        examStyle,
        questionCount,
        analysis: data.analysis,
        createdAt: Date.now(),
        differentialBuilderEnabled,
        analysisRevealStatus: differentialBuilderEnabled ? "hidden" : "revealed",
        caseFormat: actualFormat,
        progressiveGenerationStatus,
        progressiveCase,
        practiceMode,
        timerConfig: practiceMode === "exam" ? {
          mode: timerMode,
          secondsPerQuestion: timerMode === "per-question" ? secondsPerQuestion : undefined,
          totalDurationSeconds: timerMode === "total" ? totalDurationMinutes * 60 : undefined,
        } : { mode: "none" },
        adaptiveDifficultyEnabled,
      } as any;

      useCaseStore.getState().addCase(caseRecord);

      if (progressiveGenerationStatus === "failed" && caseFormat === "progressive") {
        await confirm({ title: "Progressive Mode Unavailable", message: "Progressive presentation is unavailable. The educational analysis was generated successfully, but the case could not be organised into a reliable staged format. Continuing with Complete Case.", confirmText: "OK", hideCancel: true });
      }

      // 3. Navigate to the actual case viewer
      router.push(`/case?id=${caseId}`);
    } catch (error) {
      console.error("Unable to create case:", error);
      await confirm({ title: "Analysis Failed", message: `Failed to analyze case. Error: ${error instanceof Error ? error.message : String(error)}`, confirmText: "OK", hideCancel: true });
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className="container">
        <div className={styles.utilityRow}>
          <Link href="/" className="btn-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Home
          </Link>

          <div className={styles.utilityActions}>
            <button
              type="button"
              className={styles.utilityButton}
              onClick={generateRandomCase}
            >
              Generate Example Case
            </button>

            <button
              type="button"
              className={styles.resetButton}
              onClick={() => setShowResetDialog(true)}
              disabled={
                !title &&
                !caseContent &&
                difficulty === "Intermediate" &&
                examStyle === "General" &&
                questionCount === 5 &&
                caseFormat === "complete"
              }
            >
              Reset Form
            </button>
          </div>
        </div>

        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Educational case workspace</p>

          <h1>New Case Study</h1>

          <p>
            Enter a fictional or de-identified clinical case for
            AI-assisted educational analysis.
          </p>
        </header>

        <div className={styles.privacyNotice}>
          <div className={styles.noticeIcon} aria-hidden="true">
            i
          </div>

          <div>
            <strong>Protect identifying information</strong>

            <p>
              Do not enter names, contact information, record numbers,
              full dates of birth, addresses, or other patient
              identifiers.
            </p>
          </div>

          <Link href="/privacy">Review Privacy</Link>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="case-title">
                Case title <span>Optional</span>
              </label>

              <span className={styles.fieldHint}>
                Used only to identify the saved case
              </span>
            </div>

            <input
              id="case-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Example: 55-year-old man with chest pain"
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="case-content">
                Educational case narrative
              </label>

              <span
                className={`${styles.characterCount} ${
                  characterCount > MAX_CASE_LENGTH
                    ? styles.characterCountError
                    : ""
                }`}
              >
                {characterCount.toLocaleString()} /{" "}
                {MAX_CASE_LENGTH.toLocaleString()}
              </span>
            </div>

            <textarea
              id="case-content"
              name="caseContent"
              value={caseContent}
              onChange={(event) => {
                setCaseContent(event.target.value);
                setSubmitAttempted(false);
              }}
              placeholder="Describe the presenting complaint, time course, relevant history, examination findings, investigations, and important negative findings..."
              rows={11}
              aria-describedby="case-content-help case-content-error"
              aria-invalid={Boolean(validationMessage)}
            />

            <div className={styles.fieldFooter}>
              <p id="case-content-help">
                Minimum {MIN_CASE_LENGTH} characters. Plain text only.
              </p>

              {validationMessage && (
                <p
                  id="case-content-error"
                  className={styles.errorMessage}
                  role="alert"
                >
                  {validationMessage}
                </p>
              )}
            </div>
          </div>

          <div className={styles.settingsGrid}>
            <fieldset className={styles.settingGroup}>
              <legend>Difficulty</legend>

              <div className={styles.segmentedControl}>
                {(
                  [
                    "Basic",
                    "Intermediate",
                    "Advanced",
                  ] as Difficulty[]
                ).map((option) => (
                  <label
                    key={option}
                    className={`${styles.segmentOption} ${
                      difficulty === option
                        ? styles.segmentOptionActive
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={option}
                      checked={difficulty === option}
                      onChange={() => setDifficulty(option)}
                    />

                    <span>{option}</span>
                  </label>
                ))}
              </div>

              <p className={styles.settingDescription}>
                {difficulty === "Basic" &&
                  "Foundational concepts and direct clinical clues."}

                {difficulty === "Intermediate" &&
                  "Standard clinical reasoning and moderate comparison."}

                {difficulty === "Advanced" &&
                  "Subtle clues, deeper integration, and complex alternatives."}
              </p>
            </fieldset>

            <fieldset className={styles.settingGroup}>
              <legend>Exam style</legend>

              <Dropdown
                value={examStyle}
                onChange={(val) => setExamStyle(val as ExamStyle)}
                aria-label="Exam style"
                options={[
                  { value: "General", label: "General" },
                  { value: "NRE", label: "NRE" },
                  { value: "USMLE", label: "USMLE" },
                  { value: "PLAB", label: "PLAB" },
                  { value: "MRCP", label: "MRCP" },
                ]}
              />

              <p className={styles.settingDescription}>
                Controls the style of reasoning and practice questions.
              </p>
            </fieldset>

            <fieldset className={styles.settingGroup}>
              <legend>Practice Mode</legend>

              <div className={styles.segmentedControl}>
                <label
                  className={`${styles.segmentOption} ${
                    practiceMode === "learning" ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="practiceMode"
                    value="learning"
                    checked={practiceMode === "learning"}
                    onChange={() => {
                      setPracticeMode("learning");
                      setTimerMode("none"); // Reset timer for learning mode
                    }}
                  />
                  <span>Learning Mode</span>
                </label>

                <label
                  className={`${styles.segmentOption} ${
                    practiceMode === "exam" ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="practiceMode"
                    value="exam"
                    checked={practiceMode === "exam"}
                    onChange={() => setPracticeMode("exam")}
                  />
                  <span>Exam Mode</span>
                </label>
              </div>

              <p className={styles.settingDescription}>
                {practiceMode === "learning" &&
                  "Receive explanations and confidence feedback immediately after each question."}
                {practiceMode === "exam" &&
                  "Complete the full question set before viewing answers and explanations."}
              </p>
            </fieldset>

            {practiceMode === "exam" && (
              <fieldset className={styles.settingGroup}>
                <legend>Timer</legend>

                <div className={styles.segmentedControl}>
                  {(["none", "per-question", "total"] as const).map((opt) => (
                    <label
                      key={opt}
                      className={`${styles.segmentOption} ${
                        timerMode === opt ? styles.segmentOptionActive : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="timerMode"
                        value={opt}
                        checked={timerMode === opt}
                        onChange={() => setTimerMode(opt)}
                      />
                      <span>
                        {opt === "none" && "No timer"}
                        {opt === "per-question" && "Per question"}
                        {opt === "total" && "Total duration"}
                      </span>
                    </label>
                  ))}
                </div>

                {timerMode === "per-question" && (
                  <div className={styles.segmentedControl} style={{ marginTop: '12px' }}>
                    {([60, 90]).map((seconds) => (
                      <label
                        key={seconds}
                        className={`${styles.segmentOption} ${
                          secondsPerQuestion === seconds ? styles.segmentOptionActive : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="secondsPerQuestion"
                          value={seconds}
                          checked={secondsPerQuestion === seconds}
                          onChange={() => setSecondsPerQuestion(seconds)}
                        />
                        <span>{seconds} seconds</span>
                      </label>
                    ))}
                  </div>
                )}

                {timerMode === "total" && (
                  <div style={{ marginTop: '12px' }}>
                    <label htmlFor="totalDuration" style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                      Total minutes
                    </label>
                    <input
                      id="totalDuration"
                      type="number"
                      min={1}
                      max={180}
                      value={totalDurationMinutes}
                      onChange={(e) => setTotalDurationMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                      style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', width: '100px' }}
                    />
                  </div>
                )}

                <p className={styles.settingDescription} style={{ marginTop: '12px' }}>
                  {timerMode === "none" && "Take your time. No forced submission."}
                  {timerMode === "per-question" && "If time runs out, the currently selected answer will be submitted."}
                  {timerMode === "total" && "If total time runs out, the exam completes immediately."}
                </p>
              </fieldset>
            )}

            <fieldset className={styles.settingGroup}>
              <legend>Adaptive Difficulty</legend>

              <div className={styles.segmentedControl}>
                <label
                  className={`${styles.segmentOption} ${
                    adaptiveDifficultyEnabled ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="adaptiveDifficultyEnabled"
                    checked={adaptiveDifficultyEnabled}
                    onChange={() => setAdaptiveDifficultyEnabled(true)}
                  />
                  <span>Enabled</span>
                </label>

                <label
                  className={`${styles.segmentOption} ${
                    !adaptiveDifficultyEnabled ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="adaptiveDifficultyEnabled"
                    checked={!adaptiveDifficultyEnabled}
                    onChange={() => setAdaptiveDifficultyEnabled(false)}
                  />
                  <span>Disabled</span>
                </label>
              </div>

              <p className={styles.settingDescription}>
                {practiceMode === "exam" ? (
                  <>
                    Applies only after Exam Mode results. The active exam question set remains fixed.
                  </>
                ) : adaptiveDifficultyEnabled ? (
                  "Future focused-practice questions adjust based on your performance, confidence, and repeated concept errors."
                ) : (
                  "Use the selected difficulty for all generated questions."
                )}
              </p>
            </fieldset>

            <fieldset className={styles.settingGroup}>
              <legend>Practice questions</legend>

              <div className={styles.questionCountOptions}>
                {([3, 5, 10] as QuestionCount[]).map((count) => (
                  <label
                    key={count}
                    className={`${styles.countOption} ${
                      questionCount === count
                        ? styles.countOptionActive
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="questionCount"
                      value={count}
                      checked={questionCount === count}
                      onChange={() => setQuestionCount(count)}
                    />

                    <span>{count}</span>
                  </label>
                ))}
              </div>

              <p className={styles.settingDescription}>
                Questions are generated after the case analysis.
              </p>
            </fieldset>

            <fieldset className={styles.settingGroup}>
              <legend>Differential Builder</legend>

              <div className={styles.segmentedControl}>
                <label
                  className={`${styles.segmentOption} ${
                    differentialBuilderEnabled ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="differentialBuilderEnabled"
                    checked={differentialBuilderEnabled}
                    onChange={() => setDifferentialBuilderEnabled(true)}
                  />
                  <span>Enabled</span>
                </label>

                <label
                  className={`${styles.segmentOption} ${
                    !differentialBuilderEnabled ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="differentialBuilderEnabled"
                    checked={!differentialBuilderEnabled}
                    onChange={() => setDifferentialBuilderEnabled(false)}
                  />
                  <span>Disabled</span>
                </label>
              </div>

              <p className={styles.settingDescription}>
                Build your own differential before viewing the educational analysis.
              </p>
            </fieldset>

            <fieldset className={styles.settingGroup}>
              <legend>Case Format</legend>

              <div className={styles.segmentedControl}>
                <label
                  className={`${styles.segmentOption} ${
                    caseFormat === "complete" ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="caseFormat"
                    value="complete"
                    checked={caseFormat === "complete"}
                    onChange={() => setCaseFormat("complete")}
                  />
                  <span>Complete</span>
                </label>

                <label
                  className={`${styles.segmentOption} ${
                    caseFormat === "progressive" ? styles.segmentOptionActive : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="caseFormat"
                    value="progressive"
                    checked={caseFormat === "progressive"}
                    onChange={() => setCaseFormat("progressive")}
                  />
                  <span>Progressive</span>
                </label>
              </div>

              <p className={styles.settingDescription}>
                Work through the case in stages or review it completely at once. Progressive Reveal generates new stages based on the submitted case.
              </p>
            </fieldset>
          </div>

          <div className={styles.formActions}>
            <div className={styles.educationalReminder}>
              <span aria-hidden="true">ⓘ</span>

              <p>
                Generated content may contain errors. Check important
                information against trusted medical sources.
              </p>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Preparing Analysis
                </>
              ) : (
                <>
                  Analyse Case
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {showResetDialog && (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowResetDialog(false);
            }
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
          >
            <div className={styles.dialogIcon} aria-hidden="true">
              ↺
            </div>

            <h2 id="reset-dialog-title">Reset the form?</h2>

            <p>
              This clears the case narrative and restores all settings
              to their defaults.
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dialogCancelButton}
                onClick={() => setShowResetDialog(false)}
              >
                Keep My Changes
              </button>

              <button
                type="button"
                className={styles.dialogResetButton}
                onClick={resetForm}
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
