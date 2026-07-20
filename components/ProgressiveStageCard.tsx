import React from "react";
import styles from "./ProgressiveCaseReveal.module.css";
import { ProgressiveCaseStage } from "@/lib/store";

interface ProgressiveStageCardProps {
  currentStage: ProgressiveCaseStage;
  previousStages: ProgressiveCaseStage[];
}

export function ProgressiveStageCard({ currentStage, previousStages }: ProgressiveStageCardProps) {
  return (
    <div className={styles.stageCardContainer}>
      <div className={styles.stageCard}>
        <h2 className={styles.stageTitle}>{currentStage.title}</h2>
        <div className={styles.stageContent}>
          {currentStage.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        
        {currentStage.unavailableInformation && currentStage.unavailableInformation.length > 0 && (
          <div className={styles.unavailableInfo}>
            <strong>Unavailable Information:</strong>
            <ul>
              {currentStage.unavailableInformation.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
