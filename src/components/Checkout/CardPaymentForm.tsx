/**
 * CardPaymentForm component
 *
 * Displays a payment confirmation interface for credit/debit card payments.
 * Simulates a 3-second processing delay before completing.
 *
 * Requirements: 7.9
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Payment } from '../../types';

export interface CardPaymentFormProps {
  /** Payment method: 'credit' or 'debit' */
  method: 'credit' | 'debit';
  /** Transaction total in cents */
  total: number;
  /** Whether a payment is currently being processed */
  isProcessing: boolean;
  /** Called with the completed Payment when processing finishes */
  onComplete: (payment: Payment) => void;
  /** Called when the cashier cancels */
  onCancel: () => void;
}

/** Format a cent amount as a dollar string */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const PROCESSING_DELAY_MS = 3000;

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  method,
  total,
  isProcessing,
  onComplete,
  onCancel,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate processing progress bar
  useEffect(() => {
    if (!isSimulating) return;

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / PROCESSING_DELAY_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleConfirm = useCallback(() => {
    setIsSimulating(true);
    setProgress(0);

    setTimeout(() => {
      setIsSimulating(false);
      // Generate a mock authorization code and last-4 digits
      const authCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const last4 = String(Math.floor(1000 + Math.random() * 9000));

      const payment: Payment = {
        method,
        cardLast4: last4,
        authorizationCode: authCode,
      };

      onComplete(payment);
    }, PROCESSING_DELAY_MS);
  }, [method, onComplete]);

  const methodLabel = method === 'credit' ? 'Credit Card' : 'Debit Card';
  const processing = isProcessing || isSimulating;

  return (
    <div className="space-y-4" aria-label={`${methodLabel} payment form`}>
      <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-gray-600 font-medium" style={{ fontSize: '14px' }}>
          Total Due
        </span>
        <span className="font-bold text-gray-800" style={{ fontSize: '20px' }}>
          {formatCents(total)}
        </span>
      </div>

      {/* Card icon and instructions */}
      <div className="text-center space-y-2 py-4">
        <div className="text-5xl" aria-hidden="true">
          {method === 'credit' ? '💳' : '🏦'}
        </div>
        <p className="text-gray-700 font-medium" style={{ fontSize: '16px' }}>
          {methodLabel} Payment
        </p>
        {!processing && (
          <p className="text-gray-500" style={{ fontSize: '14px' }}>
            Ask the customer to present their {method === 'credit' ? 'credit' : 'debit'} card,
            then click "Confirm Payment" to process.
          </p>
        )}
        {processing && (
          <p className="text-blue-600 font-medium" style={{ fontSize: '14px' }} aria-live="polite">
            Processing payment…
          </p>
        )}
      </div>

      {/* Progress bar */}
      {processing && (
        <div
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Payment processing progress"
        >
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          aria-label={`Cancel ${methodLabel} payment`}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-40 transition-colors"
          style={{ fontSize: '14px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          aria-label={`Confirm ${methodLabel} payment`}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontSize: '14px' }}
        >
          {processing ? 'Processing…' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
};
