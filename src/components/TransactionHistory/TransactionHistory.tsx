/**
 * TransactionHistory component (presentational)
 *
 * A modal/side-panel that shows the transaction list and, when a transaction
 * is selected, the full receipt detail.
 *
 * This component is intentionally presentational – all store interactions
 * are handled by ConnectedTransactionHistory.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '../../types';
import { TransactionList } from './TransactionList';
import { TransactionDetail } from './TransactionDetail';

export interface TransactionHistoryProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Transactions to display (already limited to 50 by the caller) */
  transactions: Transaction[];
  /** Whether the app is currently online (Req 12.5, 12.6) */
  isOnline: boolean;
  /** Called when the user closes the panel */
  onClose: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  isOpen,
  transactions,
  isOnline,
  onClose,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Reset selection when panel is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedTransaction(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTransaction) {
          setSelectedTransaction(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTransaction, onClose]);

  const handleSelect = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/40"
      onClick={(e) => {
        // Close when clicking the backdrop (not the panel itself)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Side panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction history"
        className="relative flex flex-col bg-white shadow-2xl w-full max-w-md h-full"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-bold text-gray-800" style={{ fontSize: '18px' }}>
              Transaction History
            </h2>
            {/* Offline / online indicator (Req 12.5, 12.6) */}
            {!isOnline ? (
              <p
                className="text-amber-600 flex items-center gap-1 mt-0.5"
                role="status"
                aria-live="polite"
                style={{ fontSize: '14px' }}
              >
                <span aria-hidden="true">🔌</span>
                Offline – showing local history
              </p>
            ) : (
              <p
                className="text-green-600 flex items-center gap-1 mt-0.5"
                role="status"
                aria-live="polite"
                style={{ fontSize: '14px' }}
              >
                <span aria-hidden="true">🟢</span>
                Synced with backend
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction history"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded p-1"
            style={{ fontSize: '14px' }}
          >
            ✕
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto">
          {selectedTransaction ? (
            <TransactionDetail
              transaction={selectedTransaction}
              onBack={handleBack}
            />
          ) : (
            <TransactionList
              transactions={transactions}
              selectedId={null}
              onSelect={handleSelect}
            />
          )}
        </div>

        {/* Footer: transaction count */}
        {!selectedTransaction && transactions.length > 0 && (
          <div
            className="px-4 py-2 border-t border-gray-100 text-gray-400 text-center shrink-0"
            style={{ fontSize: '14px' }}
          >
            Showing {transactions.length} of last 50 transactions
          </div>
        )}
      </div>
    </div>
  );
};
