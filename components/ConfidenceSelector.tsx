import styles from "./ConfidenceSelector.module.css";
import { ConfidenceLevel } from "@/lib/confidenceUtils";

type ConfidenceSelectorProps = {
  value: ConfidenceLevel | null;
  onChange: (value: ConfidenceLevel) => void;
  disabled?: boolean;
  error?: string;
};

const confidenceOptions: {
  value: ConfidenceLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "Low",
    label: "Low confidence",
    description: "I am unsure or partly guessing.",
  },
  {
    value: "Moderate",
    label: "Moderate confidence",
    description: "I think this is correct, but I am not fully certain.",
  },
  {
    value: "High",
    label: "High confidence",
    description: "I am confident that I understand the reasoning.",
  },
];

export function ConfidenceSelector({
  value,
  onChange,
  disabled = false,
  error,
}: ConfidenceSelectorProps) {
  return (
    <fieldset
      className={styles.confidenceSelector}
      aria-describedby={
        error ? "confidence-help confidence-error" : "confidence-help"
      }
    >
      <div className={styles.confidenceHeader}>
        <legend>How confident are you?</legend>
        <p id="confidence-help">
          Rate your confidence before submitting your answer.
        </p>
      </div>

      <div className={styles.confidenceOptions}>
        {confidenceOptions.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={[
                styles.confidenceOption,
                isSelected ? styles.confidenceOptionSelected : "",
                disabled ? styles.confidenceOptionDisabled : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name="confidence"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className={styles.radioInput}
              />

              <span className={styles.confidenceOptionContent}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id="confidence-error" className={styles.confidenceError} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
