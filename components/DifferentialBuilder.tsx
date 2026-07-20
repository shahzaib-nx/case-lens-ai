"use client";

import { useState, useEffect } from "react";
import {
  LearnerDifferentialDraft,
  LearnerDifferentialEntry,
  LearnerDifferentialSubmission,
  DifferentialConfidence,
} from "@/lib/store";
import { ConfidenceSelector } from "./ConfidenceSelector";
import styles from "./DifferentialBuilder.module.css";
import { useConfirm } from "./ConfirmProvider";

type DifferentialBuilderProps = {
  caseId: string;
  initialDraft?: LearnerDifferentialDraft;
  onSaveDraft: (draft: LearnerDifferentialDraft) => void;
  onSubmit: (submission: Omit<LearnerDifferentialSubmission, "id" | "status" | "submittedAt">) => void;
  onSkip: () => void;
};

export function DifferentialBuilder({
  caseId,
  initialDraft,
  onSaveDraft,
  onSubmit,
  onSkip,
}: DifferentialBuilderProps) {
  const { confirm } = useConfirm();
  
  const [entries, setEntries] = useState<LearnerDifferentialEntry[]>(
    initialDraft?.entries.length
      ? initialDraft.entries
      : [
          {
            id: crypto.randomUUID(),
            role: "primary",
            interpretation: "",
            supportingFindings: [""],
            opposingFindings: [""],
            reasoningNote: "",
          },
          {
            id: crypto.randomUUID(),
            role: "alternative",
            interpretation: "",
            supportingFindings: [""],
            opposingFindings: [""],
            reasoningNote: "",
          },
        ]
  );
  
  const [mostInfluentialFinding, setMostInfluentialFinding] = useState(
    initialDraft?.mostInfluentialFinding || ""
  );
  const [influentialFindingReason, setInfluentialFindingReason] = useState(
    initialDraft?.influentialFindingReason || ""
  );
  const [confidence, setConfidence] = useState<DifferentialConfidence | undefined>(
    initialDraft?.confidence
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Debounced save
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onSaveDraft({
        entries,
        mostInfluentialFinding,
        influentialFindingReason,
        confidence,
        updatedAt: new Date().toISOString(),
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [entries, mostInfluentialFinding, influentialFindingReason, confidence, onSaveDraft]);

  const handleAddAlternative = () => {
    if (entries.length >= 3) return; // Limit to 2 alternatives + 1 primary
    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        role: "alternative",
        interpretation: "",
        supportingFindings: [""],
        opposingFindings: [""],
        reasoningNote: "",
      },
    ]);
  };

  const handleEntryChange = (id: string, updates: Partial<LearnerDifferentialEntry>) => {
    setEntries(entries.map(e => e.id === id ? { ...e, ...updates } : e));
    if (errors[id] || errors[`${id}-support`]) {
      const newErrors = { ...errors };
      delete newErrors[id];
      delete newErrors[`${id}-support`];
      setErrors(newErrors);
    }
  };

  const handleArrayChange = (entryId: string, field: "supportingFindings" | "opposingFindings", value: string) => {
    handleEntryChange(entryId, { [field]: [value] });
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    entries.forEach(entry => {
      if (!entry.interpretation.trim()) {
        newErrors[entry.id] = entry.role === "primary" ? "Enter your most likely educational interpretation." : "Alternative interpretation cannot be empty if added.";
      }
      if (entry.role === "primary" && (!entry.supportingFindings[0] || !entry.supportingFindings[0].trim())) {
        newErrors[`${entry.id}-support`] = "Add a finding that supports your leading interpretation.";
      }
    });

    if (!mostInfluentialFinding.trim()) {
      newErrors.mostInfluentialFinding = "Identify the case clue that influenced you most.";
    }
    
    if (!influentialFindingReason.trim()) {
      newErrors.influentialFindingReason = "Explain why that clue mattered.";
    }

    if (!confidence) {
      newErrors.confidence = "Select your confidence level.";
    }

    // Must have at least one alternative that is not empty
    const validAlternatives = entries.filter(e => e.role === "alternative" && e.interpretation.trim());
    if (validAlternatives.length === 0) {
      newErrors.general = "Add at least one alternative interpretation.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Try to focus first invalid field roughly
      const firstId = Object.keys(newErrors)[0];
      const el = document.getElementById(firstId) || document.querySelector(`[name="${firstId}"]`);
      if (el) (el as HTMLElement).focus();
      return;
    }

    onSubmit({
      entries: entries.filter(e => e.interpretation.trim()), // only valid entries
      mostInfluentialFinding,
      influentialFindingReason,
      confidence: confidence as DifferentialConfidence,
    });
  };

  const handleSkip = async () => {
    if (await confirm({
      title: "Skip the differential exercise?",
      message: "You can view the generated educational analysis without submitting your own reasoning. This case will not include a learner differential comparison.",
      confirmText: "Skip and View Analysis",
      cancelText: "Continue Building"
    })) {
      onSkip();
    }
  };

  return (
    <section aria-labelledby="differential-builder-title" className={styles.differentialBuilder}>
      <header className={styles.builderHeader}>
        <p>Clinical reasoning exercise</p>
        <h1 id="differential-builder-title">Build Your Differential</h1>
        <p className={styles.subtitle}>
          Review the case information and record your reasoning before viewing the generated educational analysis.
        </p>
        <div style={{ marginTop: '12px', background: 'var(--error-bg)', color: 'var(--error)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
          <strong>Safety note:</strong> This is an educational reasoning exercise. Do not use CaseLens AI for real-patient diagnosis or treatment decisions.
        </div>
      </header>

      {errors.general && <div className={styles.errorMessage} role="alert">{errors.general}</div>}

      <div className={styles.cardContainer}>
        {entries.map((entry, index) => {
          const isPrimary = entry.role === "primary";
          const title = isPrimary ? "Most Likely Interpretation" : `Alternative Interpretation ${index}`;
          
          return (
            <fieldset 
              key={entry.id} 
              className={`${styles.differentialCard} ${isPrimary ? styles.differentialCardPrimary : ''}`}
            >
              <legend className={styles.cardLegend}>{title}</legend>
              
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor={entry.id}>Educational interpretation</label>
                  <input
                    id={entry.id}
                    className={`${styles.input} ${errors[entry.id] ? styles.inputError : ''}`}
                    value={entry.interpretation}
                    placeholder={isPrimary ? "Example: Left middle cerebral artery ischaemic stroke" : "Another plausible interpretation"}
                    onChange={(e) => handleEntryChange(entry.id, { interpretation: e.target.value })}
                  />
                  {errors[entry.id] && <span className={styles.errorText} role="alert">{errors[entry.id]}</span>}
                </div>

                <div className={styles.field}>
                  <label>Which findings support this interpretation?</label>
                  <textarea
                    className={`${styles.textarea} ${errors[`${entry.id}-support`] ? styles.inputError : ''}`}
                    value={entry.supportingFindings[0] || ""}
                    onChange={(e) => handleArrayChange(entry.id, "supportingFindings", e.target.value)}
                  />
                  {errors[`${entry.id}-support`] && <span className={styles.errorText} role="alert">{errors[`${entry.id}-support`]}</span>}
                </div>

                <div className={styles.field}>
                  <label>Which findings argue against this interpretation?</label>
                  <textarea
                    className={styles.textarea}
                    value={entry.opposingFindings[0] || ""}
                    onChange={(e) => handleArrayChange(entry.id, "opposingFindings", e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label>Why did you include this interpretation? <span className={styles.fieldHint}>Optional</span></label>
                  <textarea
                    className={styles.textarea}
                    value={entry.reasoningNote || ""}
                    placeholder="Explain how the time course, localisation, symptoms, examination findings, or investigations influenced your reasoning."
                    onChange={(e) => handleEntryChange(entry.id, { reasoningNote: e.target.value })}
                  />
                </div>
              </div>
            </fieldset>
          );
        })}

        {entries.length < 3 && (
          <button 
            type="button" 
            onClick={handleAddAlternative} 
            className={styles.secondaryButton}
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Another Alternative
          </button>
        )}
      </div>

      <div className={styles.decisiveSection}>
        <h2>Most Influential Finding</h2>
        
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label htmlFor="mostInfluentialFinding">Which single case finding influenced your reasoning most?</label>
            <textarea
              id="mostInfluentialFinding"
              className={`${styles.textarea} ${errors.mostInfluentialFinding ? styles.inputError : ''}`}
              value={mostInfluentialFinding}
              onChange={(e) => {
                setMostInfluentialFinding(e.target.value);
                if (errors.mostInfluentialFinding) setErrors(prev => ({ ...prev, mostInfluentialFinding: "" }));
              }}
              placeholder="Example: Expressive aphasia with right facial and upper-limb weakness"
            />
            {errors.mostInfluentialFinding && <span className={styles.errorText} role="alert">{errors.mostInfluentialFinding}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="influentialFindingReason">Why was this finding important?</label>
            <textarea
              id="influentialFindingReason"
              className={`${styles.textarea} ${errors.influentialFindingReason ? styles.inputError : ''}`}
              value={influentialFindingReason}
              onChange={(e) => {
                setInfluentialFindingReason(e.target.value);
                if (errors.influentialFindingReason) setErrors(prev => ({ ...prev, influentialFindingReason: "" }));
              }}
              placeholder="Explain how this clue changed or narrowed your differential."
            />
            {errors.influentialFindingReason && <span className={styles.errorText} role="alert">{errors.influentialFindingReason}</span>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px' }} id="confidence">
        <label className={styles.cardLegend}>How confident are you in this differential?</label>
        <ConfidenceSelector
          value={confidence || null}
          onChange={(val) => {
            setConfidence(val as DifferentialConfidence);
            if (errors.confidence) setErrors(prev => ({ ...prev, confidence: "" }));
          }}
        />
        {errors.confidence && <span className={styles.errorText} role="alert" style={{ display: 'block', marginTop: '8px' }}>{errors.confidence}</span>}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={handleSkip} className={styles.secondaryButton}>
          Skip Differential
        </button>
        
        <div className={styles.rightActions}>
          <button type="button" onClick={handleSubmit} className={styles.submitButton}>
            Submit Differential
          </button>
        </div>
      </div>
    </section>
  );
}
