/**
 * TransactionList component (presentational)
 *
 * Displays a list of the last 50 transactions with date, time, total, and
 * payment method. Clicking a row selects the transaction for detail view.
 *
 * Requirements: 12.1, 12.3
 */

import React from 'react';
import type { Transaction } from '../../types';

/** Format a Unix timestamp as a locale date string */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a Unix timestamp as a locale time string */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format cents as a dollar string */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Human-readable payment method label */
function paymentLabel(method: Transaction['payment']['method']): string {
  switch (method) {
    case 'cash':
      return '💵 Cash';
    case 'credit':
      return '💳 Credit';
    case 'debit':
      return '🏦 Debit';
  }
}

/** Sync status badge */
function SyncBadge({ status }: { status: Transaction['syncStatus'] }) {
  if (status === 'synced') return null;
  return (
    <span
      className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
        status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
      }`}
      aria-label={status === 'pending' ? 'Pending sync' : 'Sync failed'}
    >
      {status === 'pending' ? '⏳' : '⚠️'}
    </span>
  );
}

export interface TransactionListProps {
  /** Transactions to display (already limited to 50 by the caller) */
  transactions: Transaction[];
  /** Currently selected transaction ID */
  selectedId: string | null;
  /** Called when the user clicks a transaction row */
  onSelect: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedId,
  onSelect,
}) => {
  if (transactions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-gray-400"
        role="status"
        aria-live="polite"
      >
        <span className="text-4xl mb-3" aria-hidden="true">
          🧾
        </span>
        <p style={{ fontSize: '16px' }}>No transactions yet</p>
        <p className="text-sm mt-1" style={{ fontSize: '14px' }}>
          Completed transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Transaction history"
      className="divide-y divide-gray-100"
    >
      {transactions.map((tx) => {
        const isSelected = tx.id === selectedId;
        return (
          <li key={tx.id}>
            <button
              type="button"
              onClick={() => onSelect(tx)}
              aria-pressed={isSelected}
              aria-label={`Transaction on ${formatDate(tx.timestamp)} at ${formatTime(tx.timestamp)}, total ${formatCurrency(tx.total)}, paid by ${tx.payment.method}`}
              className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 transition-colors ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              {/* Date / time */}
              <div className="min-w-0 flex-1">
                <p
                  className="font-medium text-gray-800 truncate"
                  style={{ fontSize: '15px' }}
                >
                  {formatDate(tx.timestamp)}
                  <span className="ml-2 text-gray-500 font-normal" style={{ fontSize: '14px' }}>
                    {formatTime(tx.timestamp)}
                  </span>
                  <SyncBadge status={tx.syncStatus} />
                </p>
                <p className="text-gray-500 mt-0.5" style={{ fontSize: '14px' }}>
                  {paymentLabel(tx.payment.method)} &middot; {tx.items.length}{' '}
                  {tx.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Total */}
              <p className="font-bold text-gray-900 shrink-0" style={{ fontSize: '16px' }}>
                {formatCurrency(tx.total)}
              </p>

              {/* Chevron */}
              <span className="text-gray-300 shrink-0" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
