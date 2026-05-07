/**
 * ConnectedTransactionHistory
 *
 * A store-connected wrapper around TransactionHistory that reads transaction
 * state and connectivity status directly from the Zustand store.
 *
 * Offline mode (Req 12.5):
 * - When isOnline === false the component shows locally stored transactions
 *   from the store's `transactions` array (populated by the checkout action).
 *
 * Online mode (Req 12.6):
 * - When isOnline === true the component shows the same transactions array,
 *   which is kept in sync with the backend by the SyncService.
 *
 * Requirements: 12.5, 12.6
 */

import React, { useState, useCallback } from 'react';
import { usePOSStore } from '../../store/posStore';
import { TransactionHistory } from './TransactionHistory';

/**
 * ConnectedTransactionHistory reads transaction history and connectivity
 * state from the Zustand store and forwards them to the presentational
 * TransactionHistory component.
 *
 * The component exposes a trigger button that opens the history panel.
 * Because Zustand selectors are used, the component only re-renders when
 * the relevant slices of state change.
 */
export const ConnectedTransactionHistory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Select only the slices we need to minimise re-renders.
  const isOnline = usePOSStore((s) => s.isOnline);
  const getTransactionHistory = usePOSStore((s) => s.getTransactionHistory);

  // Retrieve the last 50 transactions.
  // In offline mode this returns locally stored transactions (Req 12.5).
  // In online mode this returns the synced transaction list (Req 12.6).
  const transactions = getTransactionHistory(50);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="View transaction history"
        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        style={{ fontSize: '14px' }}
      >
        <span aria-hidden="true">🧾</span>
        History
      </button>

      {/* Panel */}
      <TransactionHistory
        isOpen={isOpen}
        transactions={transactions}
        isOnline={isOnline}
        onClose={handleClose}
      />
    </>
  );
};
