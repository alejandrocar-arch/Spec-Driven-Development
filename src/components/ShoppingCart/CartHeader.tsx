/**
 * CartHeader component
 * Displays the current item count and provides a clear-cart button with confirmation.
 *
 * Requirements: 4.7, 11.3
 */

import React, { useCallback, useEffect } from 'react';

interface CartHeaderProps {
  /** Total number of distinct items in the cart */
  itemCount: number;
  /** Whether the cart is empty (disables clear button) */
  isEmpty: boolean;
  /** Called when the user confirms clearing the cart */
  onClearCart: () => void;
}

export const CartHeader: React.FC<CartHeaderProps> = ({ itemCount, isEmpty, onClearCart }) => {
  const handleClear = useCallback(() => {
    if (isEmpty) return;
    if (window.confirm('Clear all items from the cart?')) {
      onClearCart();
    }
  }, [isEmpty, onClearCart]);

  // Ctrl+K keyboard shortcut to clear cart (Req 11.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClear]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <h2
        className="font-semibold text-gray-800"
        style={{ fontSize: '16px' }}
        aria-label={`Shopping cart with ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      >
        🛒 Cart
        <span
          className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold"
          aria-hidden="true"
        >
          {itemCount}
        </span>
      </h2>

      <button
        type="button"
        onClick={handleClear}
        disabled={isEmpty}
        aria-label="Clear cart (Ctrl+K)"
        title="Clear cart (Ctrl+K)"
        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontSize: '14px' }}
      >
        Clear
      </button>
    </div>
  );
};
