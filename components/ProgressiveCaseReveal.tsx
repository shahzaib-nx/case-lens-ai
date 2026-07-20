import React, { useEffect, useState } from "react";
import styles from "./ProgressiveCaseReveal.module.css";
import { CaseStudy, useCaseStore, ProgressiveStageDraft, ProgressiveStageResponse } from "@/lib/store";
import { ProgressiveStageCard } from "./ProgressiveStageCard";
import { ProgressiveReasoningForm } from "./ProgressiveReasoningForm";
import { ReasoningTimeline } from "./ReasoningTimeline";
import { useConfirm } from "./ConfirmProvider";

interface ProgressiveCaseRevealProps {
  caseStudy: CaseStudy;
}

export function ProgressiveCaseReveal({ caseStudy }: ProgressiveCaseRevealProps) {
  const { confirm } = useConfirm();
  const session = caseStudy.progressiveSession;
  const progressiveCase = caseStudy.progressiveCase;
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!progressiveCase || !session) {
    return null;
  }

  const { stages } = progressiveCase;
  const { currentStageIndex, status, stageResponses } = session;

  const currentStage = stages[currentStageIndex];
  const previousStages = stages.slice(0, currentStageIndex);

  const handleSaveDraft = (draft: ProgressiveStageDraft) => {
    useCaseStore.getState().updateProgressiveDraft(caseStudy.id, draft);
  };

  const handleSubmitStage = (response: Omit<ProgressiveStageResponse, "id" | "submittedAt">) => {
    const fullResponse: ProgressiveStageResponse = {
      ...response,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };
    
    useCaseStore.getState().submitProgressiveStage(caseStudy.id, fullResponse);

    if (currentStageIndex === stages.length - 1) {
      useCaseStore.getState().completeProgressiveReview(caseStudy.id);
    }
  };

  const handleSkip = async () => {
    if (await confirm({
      title: "Skip the progressive reasoning exercise?",
      message: "The remaining case information and generated educational analysis will be revealed. Your completed stage responses will remain saved, but this progressive session will be marked as skipped.",
      confirmText: "Skip and Reveal Case"
    })) {
      useCaseStore.getState().skipProgressiveReview(caseStudy.id);
    }
  };

  if (status === "completed") {
    return (
      <div className={styles.progressiveLayout}>
        <ReasoningTimeline responses={stageResponses} stages={stages} />
        {caseStudy.differentialBuilderEnabled && (
          <div className={styles.completionMessage}>
            <p>Your final-stage reasoning has been recorded. Review and complete your final differential below.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.progressiveLayout}>
      <header className={styles.progressHeader}>
        <div className={styles.progressLabel}>
          <span>Stage {currentStageIndex + 1} of {stages.length}</span>
          <button onClick={handleSkip} className={styles.skipButton}>Skip Progressive Review</button>
        </div>
        <div className={styles.progressTrack}>
          <div 
            className={styles.progressValue} 
            style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
          />
        </div>
      </header>

      <div className={styles.stageStack}>
        <div className={styles.stageContentCol}>
          <ProgressiveStageCard 
            currentStage={currentStage} 
            previousStages={[]} 
          />
        </div>
        
        <div className={styles.reasoningWrapper}>
          <ProgressiveReasoningForm 
            key={currentStage.id}
            stageId={currentStage.id}
            stageOrder={currentStage.order}
            draft={caseStudy.progressiveDraft?.stageId === currentStage.id ? caseStudy.progressiveDraft : undefined}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmitStage}
          />
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <div className={styles.previousInformation}>
          <h3 className={styles.previousTitle}>Previously Revealed Information</h3>
          {previousStages.length > 0 ? (
            previousStages.map((stage) => (
              <div key={stage.id} className={styles.previousStageBlock}>
                <h4 className={styles.previousStageLabel}>{stage.title}</h4>
                <p className={styles.previousStageContent}>{stage.content}</p>
              </div>
            ))
          ) : (
            <p className={styles.previousStageContent} style={{ fontStyle: 'italic', opacity: 0.7 }}>
              No prior information has been revealed yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
