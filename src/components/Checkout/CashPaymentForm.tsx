/**
 * CashPaymentForm component
 *
 * Allows the cashier to enter the amount tendered for a cash payment.
 * Calculates and displays change due. Validates that the tendered amount
 * is sufficient before allowing completion.
 *
 * Requirements: 7.6, 7.7, 7.8
 */

import React, { useState, useCallback, useId } from 'react';
import type { Payment } from '../../types';

export interface CashPaymentFormProps {
  /** Transaction total in cents */
  total: number;
  /** Whether a payment is currently being processed */
  isProcessing: boolean;
  /** Called with the completed Payment when the cashier confirms */
  onComplete: (payment: Payment) => void;
  /** Called when the cashier cancels */
  onCancel: () => void;
}

/** Format a cent amount as a dollar string */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const CashPaymentForm: React.FC<CashPaymentFormProps> = ({
  total,
  isProcessing,
  onComplete,
  onCancel,
}) => {
  const uid = useId();
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const amountTenderedCents = Math.round(parseFloat(amountInput || '0') * 100);
  const changeDue = amountTenderedCents - total;
  const isValid = !isNaN(amountTenderedCents) && amountTenderedCents >= total;

  const handleComplete = useCallback(() => {
    setError(null);
    const tendered = Math.round(parseFloat(amountInput || '0') * 100);

    if (isNaN(tendered) || tendered <= 0) {
      setError('Please enter the amount tendered.');
      return;
    }

    if (tendered < total) {
      setError(`Insufficient payment. Amount tendered (${formatCents(tendered)}) is less than total (${formatCents(total)}).`);
      return;
    }

    const payment: Payment = {
      method: 'cash',
      amountTendered: tendered,
      changeDue: tendered - total,
    };

    onComplete(payment);
  }, [amountInput, total, onComplete]);

  return (
    <div className="space-y-4" aria-label="Cash payment form">
      <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-gray-600 font-medium" style={{ fontSize: '14px' }}>
          Total Due
        </span>
        <span className="font-bold text-gray-800" style={{ fontSize: '20px' }}>
          {formatCents(total)}
        </span>
      </div>

      <div>
        <label
          htmlFor={`${uid}-amount-tendered`}
          className="block text-gray-600 mb-1 font-medium"
          style={{ fontSize: '14px' }}
        >
          Amount Tendered ($)
        </label>
        <input
          id={`${uid}-amount-tendered`}
          type="number"
          min={0}
          step={0.01}
          value={amountInput}
          onChange={(e) => {
            setAmountInput(e.target.value);
            setError(null);
          }}
          placeholder={`e.g. ${(total / 100).toFixed(2)}`}
          aria-label="Amount tendered in dollars"
          autoFocus
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Change due */}
      {amountInput && !isNaN(amountTenderedCents) && amountTenderedCents > 0 && (
        <div
          className={`rounded-lg px-4 py-3 flex justify-between items-center ${
            isValid ? 'bg-green-50' : 'bg-red-50'
          }`}
          aria-live="polite"
        >
          <span
            className={`font-medium ${isValid ? 'text-green-700' : 'text-red-700'}`}
            style={{ fontSize: '14px' }}
          >
            {isValid ? 'Change Due' : 'Shortfall'}
          </span>
          <span
            className={`font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}
            style={{ fontSize: '18px' }}
          >
            {isValid ? formatCents(changeDue) : formatCents(total - amountTenderedCents)}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-red-600 text-sm"
          style={{ fontSize: '14px' }}
        >
          ❌ {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Cancel cash payment"
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-40 transition-colors"
          style={{ fontSize: '14px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={!isValid || isProcessing}
          aria-label="Complete cash payment"
          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontSize: '14px' }}
        >
          {isProcessing ? 'Processing…' : 'Complete Payment'}
        </button>
      </div>
    </div>
  );
};
