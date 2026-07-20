import React from "react";
import styles from "./ProgressiveCaseReveal.module.css";
import { ProgressiveStageResponse, ProgressiveCaseStage } from "@/lib/store";

interface ReasoningTimelineProps {
  responses: ProgressiveStageResponse[];
  stages: ProgressiveCaseStage[];
}

export function ReasoningTimeline({ responses, stages }: ReasoningTimelineProps) {
  if (!responses || responses.length === 0) return null;

  return (
    <div className={styles.timelineContainer}>
      <h3 className={styles.timelineHeader}>Reasoning Timeline</h3>
      <div className={styles.reasoningTimeline}>
        {responses.map((response, index) => {
          const stageLabel = stages.find(s => s.id === response.stageId)?.title || `Stage ${response.stageOrder}`;
          
          return (
            <div key={response.id} className={styles.timelineItem}>
              <div className={styles.timelineNode}></div>
              <h4 className={styles.timelineStageTitle}>{stageLabel}</h4>
              
              <div className={styles.timelineData}>
                <div className={styles.timelineField}>
                  <span className={styles.timelineLabel}>Leading interpretation:</span>
                  <span className={styles.timelineValue}>{response.leadingInterpretation}</span>
                </div>
                
                {response.differentialChanged !== "initial" && (
                  <div className={styles.timelineField}>
                    <span className={styles.timelineLabel}>Differential changed:</span>
                    <span className={styles.timelineValue}>
                      {response.differentialChanged.charAt(0).toUpperCase() + response.differentialChanged.slice(1)}
                    </span>
                  </div>
                )}
                
                {response.changeExplanation && (
                  <div className={styles.timelineField}>
                    <span className={styles.timelineLabel}>
                      {response.differentialChanged === "no" ? "Reason:" : "Explanation:"}
                    </span>
                    <span className={styles.timelineValue}>{response.changeExplanation}</span>
                  </div>
                )}
                
                <div className={styles.timelineField}>
                  <span className={styles.timelineLabel}>Most important clue:</span>
                  <span className={styles.timelineValue}>{response.mostImportantClue}</span>
                </div>

                <div className={styles.timelineField}>
                  <span className={styles.timelineLabel}>Confidence:</span>
                  <span className={styles.timelineValue}>{response.confidence}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
