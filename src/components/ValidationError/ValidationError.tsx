/**
 * ValidationError component
 * Displays inline validation error messages with auto-dismiss.
 * 
 * Implements task 21.3
 * Requirements: 13.6, 11.5
 */

import React, { useEffect, useState } from 'react';

export interface ValidationErrorProps {
  /** Error message to display */
  message: string;
  /** Whether the error is currently active */
  isVisible: boolean;
  /** Auto-dismiss duration in milliseconds (default: 5000ms) */
  autoDismissMs?: number;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ValidationError Component
 * 
 * Displays inline validation error messages with:
 * - Red text with error icon for visibility
 * - Auto-dismiss after configurable duration (default 5 seconds)
 * - Manual dismiss option
 * 
 * Requirements:
 * - 13.6: Display specific error messages for invalid data
 * - 11.5: Auto-dismiss error messages after 5 seconds
 */
export const ValidationError: React.FC<ValidationErrorProps> = ({
  message,
  isVisible,
  autoDismissMs = 5000,
  onDismiss,
  className = '',
}) => {
  const [shouldShow, setShouldShow] = useState(isVisible);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setShouldShow(isVisible);

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isVisible && autoDismissMs > 0) {
      timerRef.current = setTimeout(() => {
        setShouldShow(false);
        onDismiss?.();
        timerRef.current = null;
      }, autoDismissMs);
    }

    // Cleanup function to clear timer
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, autoDismissMs, onDismiss]);

  const handleDismiss = () => {
    // Clear the auto-dismiss timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setShouldShow(false);
    onDismiss?.();
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon */}
      <svg
        className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Error Message */}
      <p className="text-sm text-red-800 flex-1">{message}</p>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="text-red-600 hover:text-red-800 flex-shrink-0"
        aria-label="Dismiss error"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Hook for managing validation errors with auto-dismiss
 */
export function useValidationError() {
  const [error, setError] = useState<string | null>(null);

  const showError = (message: string) => {
    setError(message);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    showError,
    clearError,
    hasError: error !== null,
  };
}
