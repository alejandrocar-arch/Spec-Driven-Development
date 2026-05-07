/**
 * CheckoutPanel component (presentational)
 *
 * Handles payment method selection and delegates to CashPaymentForm or
 * CardPaymentForm. Displays the ReceiptDisplay after a successful checkout.
 *
 * This component is intentionally presentational – all store interactions
 * are handled by ConnectedCheckoutPanel.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.7, 8.8, 8.9, 11.3
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Payment, Transaction } from '../../types';
import { CashPaymentForm } from './CashPaymentForm';
import { CardPaymentForm } from './CardPaymentForm';
import { ReceiptDisplay } from './ReceiptDisplay';

export type PaymentMethod = 'cash' | 'credit' | 'debit';

export interface CheckoutPanelProps {
  /** Final transaction total in cents */
  total: number;
  /** Whether the cart has at least one item */
  hasItems: boolean;
  /** Whether the app is currently online */
  isOnline: boolean;
  /** Called with the selected payment to complete checkout */
  onCheckout: (payment: Payment) => Promise<Transaction>;
}

export const CheckoutPanel: React.FC<CheckoutPanelProps> = ({
  total,
  hasItems,
  isOnline,
  onCheckout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcut: Ctrl+Enter to open checkout (Req 11.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && hasItems && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasItems, isOpen, isProcessing]);

  const handlePaymentComplete = useCallback(
    async (payment: Payment) => {
      setError(null);
      setIsProcessing(true);
      try {
        const transaction = await onCheckout(payment);
        setCompletedTransaction(transaction);
        setIsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onCheckout]
  );

  const handleCancel = useCallback(() => {
    if (!isProcessing) {
      setIsOpen(false);
      setError(null);
    }
  }, [isProcessing]);

  const handleReceiptClose = useCallback(() => {
    setCompletedTransaction(null);
    setPaymentMethod('cash');
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleEmail = useCallback((_email: string) => {
    // Email is queued when offline (Req 8.10); online sends immediately.
    // The actual email dispatch is handled by the sync service.
    // Here we just acknowledge the request.
  }, []);

  return (
    <>
      {/* Checkout trigger button */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={!hasItems}
          aria-label="Proceed to checkout"
          title="Ctrl+Enter"
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontSize: '16px' }}
        >
          Checkout
        </button>
        {!hasItems && (
          <p className="text-xs text-gray-400 text-center mt-1" style={{ fontSize: '14px' }}>
            Add items to the cart to proceed
          </p>
        )}
      </div>

      {/* Checkout modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-800" style={{ fontSize: '18px' }}>
                Checkout
              </h2>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                aria-label="Close checkout"
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded disabled:opacity-40"
                style={{ fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Offline notice */}
              {!isOnline && (
                <div
                  role="status"
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  style={{ fontSize: '14px' }}
                >
                  <span aria-hidden="true">🔌</span>
                  <span className="text-amber-700">
                    Offline mode – transaction will be saved locally and synced when connection is
                    restored.
                  </span>
                </div>
              )}

              {/* Payment method selector (Req 7.2, 7.3, 7.4, 7.5) */}
              <div>
                <p className="text-gray-600 font-medium mb-2" style={{ fontSize: '14px' }}>
                  Payment Method
                </p>
                <div className="flex gap-2" role="group" aria-label="Payment method">
                  {(['cash', 'credit', 'debit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      disabled={isProcessing}
                      aria-pressed={paymentMethod === method}
                      aria-label={`Pay with ${method}`}
                      className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40 ${
                        paymentMethod === method
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                      style={{ fontSize: '14px' }}
                    >
                      {method === 'cash' ? '💵 Cash' : method === 'credit' ? '💳 Credit' : '🏦 Debit'}
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Payment form */}
              {paymentMethod === 'cash' ? (
                <CashPaymentForm
                  total={total}
                  isProcessing={isProcessing}
                  onComplete={handlePaymentComplete}
                  onCancel={handleCancel}
                />
              ) : (
                <CardPaymentForm
                  method={paymentMethod}
                  total={total}
                  isProcessing={isProcessing}
                  onComplete={handlePaymentComplete}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt display after successful checkout */}
      {completedTransaction && (
        <ReceiptDisplay
          transaction={completedTransaction}
          isOnline={isOnline}
          onClose={handleReceiptClose}
          onPrint={handlePrint}
          onEmail={handleEmail}
        />
      )}
    </>
  );
};
