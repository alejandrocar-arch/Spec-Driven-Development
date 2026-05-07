import React, { useEffect, useRef } from 'react';

/**
 * SuccessMessage component
 * Displays success messages with auto-dismiss after 5 seconds.
 * 
 * Implements Requirement 11.5: Auto-dismiss success messages after 5 seconds
 */

export interface SuccessMessageProps {
  /** Success message to display */
  message: string;
  
  /** Whether the message is currently visible */
  isVisible: boolean;
  
  /** Callback when message is dismissed (auto or manual) */
  onDismiss: () => void;
  
  /** Auto-dismiss duration in milliseconds (default: 5000ms) */
  autoDismissMs?: number;
  
  /** Optional CSS class name */
  className?: string;
}

/**
 * SuccessMessage Component
 * 
 * Displays success messages with:
 * - Green background with success icon for visibility
 * - Auto-dismiss after configurable duration (default 5 seconds)
 * - Manual dismiss button
 * 
 * Requirements:
 * - 11.5: Auto-dismiss success messages after 5 seconds
 */
export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  isVisible,
  onDismiss,
  autoDismissMs = 5000,
  className = '',
}) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isVisible && autoDismissMs > 0) {
      // Clear any existing timer
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      // Set new auto-dismiss timer
      timerRef.current = window.setTimeout(() => {
        onDismiss();
        timerRef.current = null;
      }, autoDismissMs);
    }

    // Cleanup on unmount or when visibility changes
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, autoDismissMs, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md success-message-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Success Icon */}
      <svg
        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Success Message */}
      <p className="text-sm text-green-800 flex-1" style={{ fontSize: '14px' }}>
        {message}
      </p>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss success message"
        className="text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 rounded p-0.5 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
 * Example usage:
 * 
 * ```tsx
 * const [success, setSuccess] = useState<string | null>(null);
 * 
 * const showSuccess = (message: string) => {
 *   setSuccess(message);
 * };
 * 
 * const dismissSuccess = () => {
 *   setSuccess(null);
 * };
 * 
 * return (
 *   <div>
 *     <button onClick={() => showSuccess('Item added to cart!')}>
 *       Add Item
 *     </button>
 *     
 *     <SuccessMessage
 *       message={success || ''}
 *       isVisible={success !== null}
 *       onDismiss={dismissSuccess}
 *     />
 *   </div>
 * );
 * ```
 */
