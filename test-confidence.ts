import assert from "assert";
import { getConfidenceInsight, calculateConfidenceSummary, getConfidenceCalibration } from "./lib/confidenceUtils.js";

// Helper to mock attempts
function mockAttempt(isCorrect: boolean, confidence?: "Low" | "Moderate" | "High" | undefined) {
  return {
    questionId: Math.random().toString(),
    selectedOptionId: "opt",
    isCorrect,
    answeredAt: new Date().toISOString(),
    attemptNumber: 1,
    confidence
  };
}

function runTests() {
  console.log("Running confidenceUtils tests...");

  // 1. All six correctness/confidence combinations
  assert.match(getConfidenceInsight({ isCorrect: true, confidence: "High" }), /high confidence/i);
  assert.match(getConfidenceInsight({ isCorrect: true, confidence: "Moderate" }), /moderate confidence/i);
  assert.match(getConfidenceInsight({ isCorrect: true, confidence: "Low" }), /low confidence/i);
  assert.match(getConfidenceInsight({ isCorrect: false, confidence: "High" }), /high confidence/i);
  assert.match(getConfidenceInsight({ isCorrect: false, confidence: "Moderate" }), /moderate confidence/i);
  assert.match(getConfidenceInsight({ isCorrect: false, confidence: "Low" }), /low confidence/i);

  // 2. Missing confidence
  assert.match(getConfidenceInsight({ isCorrect: true, confidence: undefined }), /not recorded/i);

  // 3. Summary calculations
  const attempts = [
    mockAttempt(true, "High"), mockAttempt(true, "High"),
    mockAttempt(false, "High"),
    mockAttempt(true, "Low"), mockAttempt(true, "Low"), mockAttempt(true, "Low"),
    mockAttempt(true, undefined)
  ];
  const summary = calculateConfidenceSummary(attempts);
  assert.strictEqual(summary.correctHigh, 2);
  assert.strictEqual(summary.incorrectHigh, 1);
  assert.strictEqual(summary.correctLow, 3);
  assert.strictEqual(summary.notRecorded, 1);
  assert.strictEqual(summary.totalRecorded, 6); // only the 6 with confidence

  // 4. Calibration evidence thresholds
  // < 3 records
  const smallSummary = calculateConfidenceSummary([mockAttempt(true, "High"), mockAttempt(false, "Low")]);
  const smallCal = getConfidenceCalibration(smallSummary);
  assert.strictEqual(smallCal.classification, "Insufficient evidence");

  // Well calibrated (mostly correct+high, incorrect+low)
  const wellCalSummary = calculateConfidenceSummary([
    mockAttempt(true, "High"), mockAttempt(true, "High"), mockAttempt(true, "High"),
    mockAttempt(false, "Low"), mockAttempt(false, "Low")
  ]);
  const wellCal = getConfidenceCalibration(wellCalSummary);
  assert.strictEqual(wellCal.classification, "Well calibrated");

  // Overconfident
  const overCalSummary = calculateConfidenceSummary([
    mockAttempt(false, "High"), mockAttempt(false, "High"), mockAttempt(true, "High"), mockAttempt(true, "Low")
  ]);
  const overCal = getConfidenceCalibration(overCalSummary);
  assert.strictEqual(overCal.classification, "Overconfident error pattern");

  // Underconfident
  const underCalSummary = calculateConfidenceSummary([
    mockAttempt(true, "Low"), mockAttempt(true, "Low"), mockAttempt(true, "Low"), mockAttempt(true, "Moderate")
  ]);
  const underCal = getConfidenceCalibration(underCalSummary);
  assert.strictEqual(underCal.classification, "Underconfident pattern");

  console.log("All confidence tests passed!");
}

runTests();
