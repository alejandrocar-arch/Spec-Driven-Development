/**
 * ReceiptDisplay component
 *
 * Renders a formatted receipt after a transaction is completed.
 * Provides print and email actions (email is queued when offline).
 * Auto-dismisses after 30 seconds.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { Transaction } from '../../types';

export interface ReceiptDisplayProps {
  transaction: Transaction;
  isOnline: boolean;
  onClose: () => void;
  onPrint: () => void;
  onEmail: (email: string) => void;
}

/** Format a cent amount as a dollar string, e.g. 1050 → "$10.50" */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a Unix timestamp as a locale date/time string */
function formatTimestamp(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString(),
  };
}

const AUTO_DISMISS_SECONDS = 30;

export const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  transaction,
  isOnline,
  onClose,
  onPrint,
  onEmail,
}) => {
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);

  // Auto-dismiss countdown
  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onClose]);

  const handleEmail = useCallback(() => {
    if (!emailAddress.trim()) return;
    onEmail(emailAddress.trim());
    setEmailSent(true);
  }, [emailAddress, onEmail]);

  const { receipt } = transaction;
  const { date, time } = formatTimestamp(receipt.timestamp);
  const paymentLabel =
    receipt.payment.method === 'cash'
      ? 'Cash'
      : receipt.payment.method === 'credit'
      ? 'Credit Card'
      : 'Debit Card';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receipt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800" style={{ fontSize: '18px' }}>
            Receipt
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            style={{ fontSize: '14px' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable receipt body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 font-mono" style={{ fontSize: '14px' }}>
          {/* Store info */}
          <div className="text-center space-y-1">
            <p className="font-bold text-gray-800" style={{ fontSize: '16px' }}>
              {receipt.storeName}
            </p>
            <p className="text-gray-500">{receipt.storeAddress}</p>
            <p className="text-gray-500">
              {date} {time}
            </p>
            <p className="text-gray-400 text-xs">Txn: {transaction.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <hr className="border-dashed border-gray-300" />

          {/* Items */}
          <div className="space-y-1">
            {receipt.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-700 truncate max-w-[60%]">{item.name}</span>
                  <span className="text-gray-700">{formatCents(item.lineTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs pl-2">
                  <span>
                    {item.quantity} × {formatCents(item.unitPrice)}
                  </span>
                  {item.discount !== undefined && item.discount > 0 && (
                    <span className="text-green-600">-{formatCents(item.discount)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <hr className="border-dashed border-gray-300" />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCents(receipt.subtotal)}</span>
            </div>
            {receipt.discounts > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discounts</span>
                <span>-{formatCents(receipt.discounts)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatCents(receipt.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800" style={{ fontSize: '16px' }}>
              <span>Total</span>
              <span>{formatCents(receipt.total)}</span>
            </div>
          </div>

          <hr className="border-dashed border-gray-300" />

          {/* Payment */}
          <div className="space-y-1 text-gray-600">
            <div className="flex justify-between">
              <span>Payment</span>
              <span>{paymentLabel}</span>
            </div>
            {receipt.payment.method === 'cash' && receipt.payment.amountTendered !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Tendered</span>
                  <span>{formatCents(receipt.payment.amountTendered)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{formatCents(receipt.payment.changeDue ?? 0)}</span>
                </div>
              </>
            )}
            {(receipt.payment.method === 'credit' || receipt.payment.method === 'debit') &&
              receipt.payment.cardLast4 && (
                <div className="flex justify-between">
                  <span>Card</span>
                  <span>**** {receipt.payment.cardLast4}</span>
                </div>
              )}
          </div>

          {/* Offline notice */}
          {!isOnline && (
            <p
              role="status"
              className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 text-center"
              style={{ fontSize: '14px' }}
            >
              🔌 Offline – transaction saved locally and will sync when connection is restored.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
          {/* Email receipt */}
          {!emailSent ? (
            <div className="flex gap-2">
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Email receipt (optional)"
                aria-label="Email address for receipt"
                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={handleEmail}
                disabled={!emailAddress.trim()}
                aria-label="Send receipt by email"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ fontSize: '14px' }}
              >
                {isOnline ? 'Email' : 'Queue Email'}
              </button>
            </div>
          ) : (
            <p
              role="status"
              className="text-sm text-green-600 text-center"
              style={{ fontSize: '14px' }}
            >
              ✓ {isOnline ? 'Receipt emailed' : 'Email queued for when connection is restored'}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrint}
              aria-label="Print receipt"
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              style={{ fontSize: '14px' }}
            >
              🖨 Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              style={{ fontSize: '14px' }}
            >
              Done
            </button>
          </div>

          <p
            className="text-xs text-gray-400 text-center"
            aria-live="polite"
            style={{ fontSize: '14px' }}
          >
            Auto-closing in {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
};
