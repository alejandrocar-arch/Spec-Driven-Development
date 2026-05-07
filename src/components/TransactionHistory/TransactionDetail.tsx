/**
 * TransactionDetail component (presentational)
 *
 * Displays the full receipt for a selected transaction.
 * Includes a back button to return to the transaction list.
 *
 * Requirements: 12.4
 */

import React from 'react';
import type { Transaction } from '../../types';

/** Format cents as a dollar string */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a Unix timestamp as a locale date + time string */
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Human-readable payment method label */
function paymentLabel(method: Transaction['payment']['method']): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'credit':
      return 'Credit Card';
    case 'debit':
      return 'Debit Card';
  }
}

export interface TransactionDetailProps {
  /** The transaction whose receipt to display */
  transaction: Transaction;
  /** Called when the user clicks the back button */
  onBack: () => void;
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transaction,
  onBack,
}) => {
  const { receipt, payment, syncStatus } = transaction;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to transaction list"
          className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded p-1 -ml-1"
          style={{ fontSize: '14px' }}
        >
          ← Back
        </button>
        <h3 className="font-bold text-gray-800 flex-1" style={{ fontSize: '16px' }}>
          Receipt
        </h3>
        {syncStatus !== 'synced' && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              syncStatus === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {syncStatus === 'pending' ? '⏳ Pending sync' : '⚠️ Sync failed'}
          </span>
        )}
      </div>

      {/* Receipt body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Store info */}
        <div className="text-center">
          <p className="font-bold text-gray-900" style={{ fontSize: '18px' }}>
            {receipt.storeName}
          </p>
          <p className="text-gray-500" style={{ fontSize: '14px' }}>
            {receipt.storeAddress}
          </p>
          <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>
            {formatDateTime(receipt.timestamp)}
          </p>
          <p className="text-gray-400 text-xs mt-0.5" style={{ fontSize: '14px' }}>
            Txn #{transaction.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <hr className="border-dashed border-gray-300" />

        {/* Items */}
        <div>
          <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '14px' }}>
            Items
          </p>
          <ul className="space-y-2" aria-label="Purchased items">
            {receipt.items.map((item, idx) => (
              <li key={idx} className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-800 truncate" style={{ fontSize: '14px' }}>
                    {item.name}
                  </p>
                  <p className="text-gray-500" style={{ fontSize: '14px' }}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.discount != null && item.discount > 0 && (
                      <span className="ml-1 text-green-600">
                        (−{formatCurrency(item.discount)})
                      </span>
                    )}
                  </p>
                </div>
                <p className="font-medium text-gray-800 shrink-0" style={{ fontSize: '14px' }}>
                  {formatCurrency(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <hr className="border-dashed border-gray-300" />

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between" style={{ fontSize: '14px' }}>
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-800">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discounts > 0 && (
            <div className="flex justify-between text-green-600" style={{ fontSize: '14px' }}>
              <span>Discounts</span>
              <span>−{formatCurrency(receipt.discounts)}</span>
            </div>
          )}
          <div className="flex justify-between" style={{ fontSize: '14px' }}>
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-800">{formatCurrency(receipt.tax)}</span>
          </div>
          <div
            className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"
            style={{ fontSize: '16px' }}
          >
            <span>Total</span>
            <span>{formatCurrency(receipt.total)}</span>
          </div>
        </div>

        <hr className="border-dashed border-gray-300" />

        {/* Payment details */}
        <div className="space-y-1" style={{ fontSize: '14px' }}>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment</span>
            <span className="text-gray-800">{paymentLabel(payment.method)}</span>
          </div>
          {payment.method === 'cash' && payment.amountTendered != null && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Tendered</span>
                <span className="text-gray-800">{formatCurrency(payment.amountTendered)}</span>
              </div>
              {payment.changeDue != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Change</span>
                  <span className="text-gray-800">{formatCurrency(payment.changeDue)}</span>
                </div>
              )}
            </>
          )}
          {(payment.method === 'credit' || payment.method === 'debit') &&
            payment.cardLast4 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Card</span>
                <span className="text-gray-800">•••• {payment.cardLast4}</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
