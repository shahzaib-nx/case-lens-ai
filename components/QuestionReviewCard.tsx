import React, { useState } from "react";
import styles from "./QuestionReviewCard.module.css";
import { McqQuestion, QuestionReviewAnalysis } from "@/lib/store";
import Link from "next/link";

interface Props {
  question: McqQuestion;
  analysis: QuestionReviewAnalysis;
  hideQuestionContext?: boolean;
}

export function QuestionReviewCard({ question, analysis, hideQuestionContext = false }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusColor = () => {
    if (analysis.status === "correct") return "bg-[var(--success)] text-white";
    if (analysis.status === "incorrect") return "bg-[var(--error)] text-white";
    return "bg-gray-500 text-white";
  };

  const getStatusText = () => {
    if (analysis.status === "correct") return "Correct";
    if (analysis.status === "incorrect") return "Incorrect";
    return "Unanswered";
  };

  return (
    <div className="card p-6 flex flex-col gap-6 mb-6">
      {/* 1. Status Header */}
      <div className="flex justify-between items-start border-b border-[var(--card-border)] pb-4">
        <div>
          <span style={{ 
            backgroundColor: analysis.status === 'correct' ? 'var(--success)' : analysis.status === 'incorrect' ? 'var(--error)' : '#9ca3af', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '999px', 
            fontSize: '14px', 
            fontWeight: 700, 
            display: 'inline-block' 
          }}>
            {getStatusText()}
          </span>
          <div className="text-sm text-[var(--text-secondary)] mt-2 flex gap-4">
            {question.difficulty && <span>Difficulty: {question.difficulty}</span>}
            {analysis.primaryConceptLabel && <span>Primary Concept: {analysis.primaryConceptLabel}</span>}
          </div>
        </div>
      </div>

      {/* 2. Original Question and Options */}
      {!hideQuestionContext && (
        <div>
          <h3 className="font-bold mb-3">{question.stem}</h3>
          {question.caseEvidence && question.caseEvidence.length > 0 && (
            <div className="mb-4 text-sm text-[var(--text-secondary)] bg-[var(--bg-color)] p-3 rounded">
              <strong>Case Findings:</strong>
              <ul className="list-disc pl-5 mt-1">
                {question.caseEvidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => {
              const isSelected = opt.id === analysis.selectedOptionId;
              const isCorrect = opt.id === analysis.correctOptionId;
              let borderColor = "var(--card-border)";
              let backgroundColor = "var(--card-bg)";
              let opacity = 0.7;
              
              if (isCorrect) {
              borderColor = "var(--success)";
              backgroundColor = "rgba(52, 211, 153, 0.08)"; // Soft emerald background
              opacity = 1;
              } else if (isSelected && !isCorrect) {
                borderColor = "var(--error)";
                backgroundColor = "var(--error-bg)";
                opacity = 1;
              }

              return (
                <div key={opt.id} className="hover-lift" style={{ padding: '12px', border: `1px solid ${borderColor}`, borderRadius: '8px', display: 'flex', gap: '12px', backgroundColor, opacity }}>
                  <div style={{ fontWeight: 700 }}>{opt.label}.</div>
                  <div>{opt.text}</div>
                  {isSelected && <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, alignSelf: 'center', padding: '4px 8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--card-border)' }}>Your Answer</div>}
                  {isCorrect && !isSelected && <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, alignSelf: 'center', padding: '4px 8px', backgroundColor: 'var(--success)', color: 'white', borderRadius: '4px' }}>Correct Answer</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Learner Response Summary */}
      {!analysis.selectedOptionId && (
        <div className="bg-[var(--bg-color)] p-4 rounded-lg">
          <strong>Your answer:</strong> No answer recorded
        </div>
      )}

      {/* 4. Confidence Analysis */}
      {analysis.confidence && (
        <div className="hover-lift" style={{ backgroundColor: '#eef2ff', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
          <div style={{ fontWeight: 700, color: '#4f46e5', marginBottom: '4px' }}>Confidence insight:</div>
          <div style={{ color: '#4338ca', fontSize: '14px' }}>{analysis.confidenceInsight}</div>
        </div>
      )}

      {/* 5. Main Explanations (Correct & Selected) */}
      <div className="flex flex-col gap-4 border-l-4 border-[var(--accent-color)] pl-4">
        <div>
          <h4 className="font-bold" style={{ color: '#059669' }}>Why the correct answer is correct:</h4>
          <p className="mt-1">{analysis.correctAnswerExplanation}</p>
        </div>
        {analysis.status === "incorrect" && analysis.selectedAnswerExplanation && (
          <div className="mt-2">
            <h4 className="font-bold" style={{ color: '#e11d48' }}>Why your selected answer is wrong:</h4>
            <p className="mt-1">{analysis.selectedAnswerExplanation}</p>
            {analysis.optionAnalyses.find(o => o.optionId === analysis.selectedOptionId)?.misconception && (
              <p className="mt-1 text-sm italic" style={{ color: '#ea580c' }}>
                <span className="font-bold">Likely misconception:</span> {analysis.optionAnalyses.find(o => o.optionId === analysis.selectedOptionId)?.misconception}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Collapsible: Explanation of every answer option */}
      <div className={styles.collapsibleWrapper}>
        <button 
          onClick={() => toggleSection("options")}
          className={styles.collapsibleButton}
          aria-expanded={expandedSections["options"] ? "true" : "false"}
        >
          <span>Explanation of all options</span>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSections["options"] && (
          <div className={`${styles.collapsibleContent} flex flex-col gap-4`}>
            {question.options.map(opt => {
              const optAnalysis = analysis.optionAnalyses.find(o => o.optionId === opt.id);
              if (!optAnalysis) return null;
              
              return (
                <div key={opt.id} className="pb-4 border-b last:border-0 last:pb-0">
                  <div 
                    className="font-bold mb-1"
                    style={{ color: opt.isCorrect ? '#059669' : '#e11d48' }}
                  >
                    {opt.label}. {opt.text}
                  </div>
                  <div className="text-sm">
                    <strong>{opt.isCorrect ? "Why it is correct:" : "Why it is not the best answer:"}</strong>
                    <p className="mt-1">{optAnalysis.explanation}</p>
                  </div>
                  {optAnalysis.whenItCouldBeCorrect && (
                    <div className="text-sm mt-2 text-[var(--text-secondary)]">
                      <strong>When it could be correct:</strong> {optAnalysis.whenItCouldBeCorrect}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible: Decisive Clue */}
      {analysis.decisiveClue && (
        <div className={styles.collapsibleWrapper}>
          <button 
            onClick={() => toggleSection("clue")}
            className={styles.collapsibleButton}
            aria-expanded={expandedSections["clue"] ? "true" : "false"}
          >
            <span>Decisive Clue</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections["clue"] && (
            <div className={styles.collapsibleContent}>
              <div className="font-bold mb-1">Clue: {analysis.decisiveClue.finding}</div>
              <p><strong>Why it matters:</strong> {analysis.decisiveClue.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible: Reasoning Framework */}
      {analysis.reasoningFramework && analysis.reasoningFramework.length > 0 && (
        <div className={styles.collapsibleWrapper}>
          <button 
            onClick={() => toggleSection("framework")}
            className={styles.collapsibleButton}
            aria-expanded={expandedSections["framework"] ? "true" : "false"}
          >
            <span>Reasoning Framework</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections["framework"] && (
            <div className={styles.collapsibleContent}>
              <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "decimal" }}>
                {analysis.reasoningFramework.map((step, i) => (
                  <li key={i} style={{ display: "list-item" }}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Collapsible: Error Classification & Concept Impact */}
      {(analysis.probableErrorType || analysis.conceptImpact || analysis.adaptiveRecommendation) && (
        <div className={styles.collapsibleWrapper}>
          <button 
            onClick={() => toggleSection("error")}
            className={styles.collapsibleButton}
            aria-expanded={expandedSections["error"] ? "true" : "false"}
          >
            <span>Performance & Error Analysis</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections["error"] && (
            <div className={`${styles.collapsibleContent} flex flex-col gap-4`}>
              {analysis.probableErrorType && (
                <div>
                  <div className="font-bold">Probable Error Type:</div>
                  <div>{analysis.probableErrorType}</div>
                </div>
              )}
              {analysis.conceptImpact && (
                <div>
                  <div className="font-bold">Concept Impact:</div>
                  <div className="capitalize">{analysis.conceptImpact.classification.replace(/-/g, " ")}</div>
                  <div className="text-[var(--text-secondary)] mt-1">{analysis.conceptImpact.evidenceSummary}</div>
                  <div className="text-[var(--text-secondary)] mt-1">Review Priority: <span className="capitalize font-semibold">{analysis.conceptImpact.reviewPriority}</span></div>
                </div>
              )}
              {analysis.adaptiveRecommendation && (
                <div>
                  <div className="font-bold">Adaptive Recommendation:</div>
                  <div>{analysis.adaptiveRecommendation}</div>
                </div>
              )}
              {(analysis.timeSpentSeconds !== undefined || analysis.hintsUsed !== undefined) && (
                <div className="border-t pt-2 mt-2">
                  {analysis.timeSpentSeconds !== undefined && <div><strong>Time spent:</strong> {analysis.timeSpentSeconds} seconds ({analysis.submissionReason || "Manual submission"})</div>}
                  {analysis.hintsUsed !== undefined && <div><strong>Hints used:</strong> {analysis.hintsUsed === 0 ? "None" : analysis.hintsUsed}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 16. High-yield takeaway */}
      {analysis.highYieldTakeaway && (
        <div className="hover-lift" style={{ backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '16px' }}>
          <div style={{ fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>High-yield takeaway:</div>
          <div style={{ color: '#92400e', fontSize: '14px' }}>{analysis.highYieldTakeaway}</div>
        </div>
      )}
      
      {/* 17. Memory Rule */}
      {analysis.comparisonRule && (
        <div className="hover-lift" style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e9d5ff', marginTop: '16px' }}>
          <div style={{ fontWeight: 700, color: '#9333ea', marginBottom: '4px' }}>Quick comparison / Memory aid:</div>
          <div style={{ color: '#7e22ce', fontSize: '14px' }}>{analysis.comparisonRule}</div>
        </div>
      )}

      {/* 18. Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--card-border)] mt-4">
        {question.questionSetId && (
          <Link href={`/case/study?id=${question.questionSetId}`} className="btn btn-secondary border border-[var(--card-border)] px-4 py-2 rounded font-bold text-sm hover:bg-gray-50 transition-colors">
            View Study Material
          </Link>
        )}
      </div>

    </div>
  );
}
