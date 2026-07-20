import { QuestionAttempt } from "./store";

export type ConfidenceLevel = "Low" | "Moderate" | "High";

export type ConfidenceSummary = {
  correctHigh: number;
  correctModerate: number;
  correctLow: number;
  incorrectHigh: number;
  incorrectModerate: number;
  incorrectLow: number;
  notRecorded: number;
  totalRecorded: number;
};

export function getConfidenceInsight({
  isCorrect,
  confidence,
}: {
  isCorrect: boolean;
  confidence?: ConfidenceLevel;
}): string {
  if (!confidence) {
    return "Confidence was not recorded for this attempt.";
  }

  if (isCorrect && confidence === "High") {
    return "You answered correctly with high confidence. This supports a stronger understanding of the tested concept.";
  }

  if (isCorrect && confidence === "Moderate") {
    return "You answered correctly with moderate confidence. Your reasoning appears sound, but further reinforcement may improve certainty.";
  }

  if (isCorrect && confidence === "Low") {
    return "You answered correctly with low confidence. This may have been uncertain recall or a partial guess, so the concept should still be reviewed.";
  }

  if (!isCorrect && confidence === "High") {
    return "You answered incorrectly with high confidence. This may indicate a stronger misconception rather than a simple guess.";
  }

  if (!isCorrect && confidence === "Moderate") {
    return "You answered incorrectly with moderate confidence. Review the distinction between your selected option and the correct answer.";
  }

  // Incorrect + Low
  return "You answered incorrectly with low confidence. This may reflect uncertainty or insufficient recall rather than a firmly held misconception.";
}

export function calculateConfidenceSummary(attempts: QuestionAttempt[]): ConfidenceSummary {
  const summary: ConfidenceSummary = {
    correctHigh: 0,
    correctModerate: 0,
    correctLow: 0,
    incorrectHigh: 0,
    incorrectModerate: 0,
    incorrectLow: 0,
    notRecorded: 0,
    totalRecorded: 0,
  };

  for (const attempt of attempts) {
    if (!attempt.confidence) {
      summary.notRecorded++;
      continue;
    }
    
    summary.totalRecorded++;

    if (attempt.isCorrect) {
      if (attempt.confidence === "High") summary.correctHigh++;
      else if (attempt.confidence === "Moderate") summary.correctModerate++;
      else if (attempt.confidence === "Low") summary.correctLow++;
    } else {
      if (attempt.confidence === "High") summary.incorrectHigh++;
      else if (attempt.confidence === "Moderate") summary.incorrectModerate++;
      else if (attempt.confidence === "Low") summary.incorrectLow++;
    }
  }

  return summary;
}

export function getConfidenceCalibration(summary: ConfidenceSummary): {
  classification: string;
  evidence: string;
  calibrationError: number | null;
} {
  if (summary.totalRecorded < 3) {
    return {
      classification: "Insufficient evidence",
      evidence: "Answer more questions with confidence ratings to generate a pattern.",
      calibrationError: null
    };
  }

  // Calculate Calibration Error (Optional Formula per instructions)
  // Low: 0.40, Moderate: 0.70, High: 0.90
  // Correct: 1, Incorrect: 0
  let totalError = 0;
  
  // Correct high (1 - 0.9 = 0.1)
  totalError += summary.correctHigh * Math.abs(0.9 - 1);
  // Correct mod (1 - 0.7 = 0.3)
  totalError += summary.correctModerate * Math.abs(0.7 - 1);
  // Correct low (1 - 0.4 = 0.6)
  totalError += summary.correctLow * Math.abs(0.4 - 1);
  
  // Incorrect high (0 - 0.9 = 0.9)
  totalError += summary.incorrectHigh * Math.abs(0.9 - 0);
  // Incorrect mod (0 - 0.7 = 0.7)
  totalError += summary.incorrectModerate * Math.abs(0.7 - 0);
  // Incorrect low (0 - 0.4 = 0.4)
  totalError += summary.incorrectLow * Math.abs(0.4 - 0);

  const averageError = totalError / summary.totalRecorded;

  let classification = "Mixed confidence";
  let evidence = "No stable confidence pattern is visible. Continue practicing.";

  if (averageError <= 0.25) {
    classification = "Well calibrated";
    evidence = "Correctness generally matches expressed confidence.";
  } else if (summary.incorrectHigh > 1) {
    // Overconfident error pattern requires repeated evidence
    classification = "Overconfident error pattern";
    evidence = "You repeatedly answer incorrectly with high confidence.";
  } else if (summary.correctLow > 2 && summary.correctLow > summary.correctHigh) {
    classification = "Underconfident pattern";
    evidence = "You often answer correctly with low confidence.";
  } else if (averageError > 0.35) {
    classification = "Needs confidence calibration review";
    evidence = "Your confidence frequently misaligns with your correctness.";
  }

  return {
    classification,
    evidence,
    calibrationError: Number(averageError.toFixed(2))
  };
}
