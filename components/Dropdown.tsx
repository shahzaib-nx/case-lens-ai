"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Dropdown.module.css";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

export function Dropdown({
  options,
  value,
  onChange,
  className = "",
  id,
  "aria-label": ariaLabel,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${styles.button} ${isOpen ? styles.buttonOpen : ""} ${disabled ? styles.buttonDisabled : ""}`}
      >
        <span>
          {selectedOption?.label}
        </span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className={styles.dropdownMenu}>
          <ul className={styles.optionsList}>
            {options.map((option) => (
              <li key={option.value} className={styles.optionItem}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`${styles.optionButton} ${
                    option.value === value ? styles.optionButtonSelected : ""
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
