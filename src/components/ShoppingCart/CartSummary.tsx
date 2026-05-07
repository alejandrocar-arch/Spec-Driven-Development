/**
 * CartSummary component
 * Displays subtotal, discounts, tax, and total.
 * All values are derived from the Zustand store and update within 100ms
 * of any cart modification (Req 4.2).
 *
 * Requirements: 4.2, 5.7, 6.4, 6.6
 */

import React from 'react';

interface CartSummaryProps {
  subtotal: number;
  discounts: number;
  tax: number;
  total: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, discounts, tax, total }) => {
  return (
    <div
      className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-1"
      aria-label="Cart summary"
    >
      {/* Subtotal */}
      <div className="flex justify-between text-gray-700" style={{ fontSize: '14px' }}>
        <span>Subtotal</span>
        <span aria-label={`Subtotal: $${formatCents(subtotal)}`}>${formatCents(subtotal)}</span>
      </div>

      {/* Discounts – only shown when non-zero (Req 5.7) */}
      {discounts > 0 && (
        <div
          className="flex justify-between text-green-600"
          style={{ fontSize: '14px' }}
          aria-label={`Discounts: -$${formatCents(discounts)}`}
        >
          <span>Discounts</span>
          <span>-${formatCents(discounts)}</span>
        </div>
      )}

      {/* Tax (Req 6.4) */}
      <div className="flex justify-between text-gray-700" style={{ fontSize: '14px' }}>
        <span>Tax</span>
        <span aria-label={`Tax: $${formatCents(tax)}`}>${formatCents(tax)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 pt-1 mt-1">
        {/* Total (Req 6.6) */}
        <div
          className="flex justify-between font-bold text-gray-900"
          style={{ fontSize: '16px' }}
        >
          <span>Total</span>
          <span aria-label={`Total: $${formatCents(total)}`}>${formatCents(total)}</span>
        </div>
      </div>
    </div>
  );
};
