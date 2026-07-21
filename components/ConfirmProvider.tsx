"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import styles from "./ConfirmProvider.module.css";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  hideCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3 className={styles.title}>
              {options.title || "Confirm"}
            </h3>
            <p className={styles.message}>
              {options.message}
            </p>
            <div className={styles.actions}>
              {!options.hideCancel && (
                <button onClick={handleCancel} className={`${styles.button} ${styles.buttonCancel}`}>
                  {options.cancelText || "Cancel"}
                </button>
              )}
              <button 
                onClick={handleConfirm} 
                className={`${styles.button} ${options.danger ? styles.buttonDanger : styles.buttonConfirm}`}
              >
                {options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
  return context;
}
