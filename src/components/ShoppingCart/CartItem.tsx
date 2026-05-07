/**
 * CartItem component
 * Displays a single cart item with inline quantity editing and remove button.
 * Supports keyboard shortcut (Delete) to remove the focused item.
 * Supports swipe-to-delete gesture on touch devices.
 *
 * Performance optimization (Task 24.1):
 * - Wrapped with React.memo to prevent re-renders when other cart items change
 *
 * Requirements: 4.1, 4.3, 4.4, 4.6, 5.6, 11.3, 11.4
 */

import React, { useState, useCallback, useRef } from 'react';
import type { CartItem as CartItemType } from '../../types';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

const CartItemComponent: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemoveItem }) => {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);

  // Keep local input in sync when the store updates the item externally
  React.useEffect(() => {
    setQuantityInput(String(item.quantity));
  }, [item.quantity]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityInput(e.target.value);
    setQuantityError(null);
  }, []);

  const commitQuantity = useCallback(() => {
    const parsed = parseInt(quantityInput, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > MAX_QUANTITY || !Number.isInteger(parsed)) {
      setQuantityError(`Quantity must be 0–${MAX_QUANTITY}`);
      setQuantityInput(String(item.quantity));
      return;
    }
    if (parsed === 0) {
      onRemoveItem(item.id);
    } else {
      onUpdateQuantity(item.id, parsed);
    }
  }, [quantityInput, item.id, item.quantity, onUpdateQuantity, onRemoveItem]);

  const handleQuantityKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitQuantity();
      } else if (e.key === 'Escape') {
        setQuantityInput(String(item.quantity));
        setQuantityError(null);
      }
    },
    [commitQuantity, item.quantity]
  );

  // Delete key on the row removes the item (Req 11.3)
  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>) => {
      if (e.key === 'Delete' && document.activeElement === rowRef.current) {
        e.preventDefault();
        onRemoveItem(item.id);
      }
    },
    [item.id, onRemoveItem]
  );

  // Swipe-to-delete for touch devices (Req 11.4)
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const deltaX = touchStartX.current - e.changedTouches[0].clientX;
      if (deltaX > 80) {
        // Swiped left > 80px → remove
        onRemoveItem(item.id);
      }
      touchStartX.current = null;
    },
    [item.id, onRemoveItem]
  );

  const unitPriceDollars = (item.product.price / 100).toFixed(2);
  const lineTotalDollars = (item.lineTotal / 100).toFixed(2);
  const hasDiscount = !!item.itemDiscount;
  const originalTotal = ((item.product.price * item.quantity) / 100).toFixed(2);

  return (
    <li
      ref={rowRef}
      tabIndex={0}
      onKeyDown={handleRowKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={`${item.product.name}, quantity ${item.quantity}, $${lineTotalDollars}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
    >
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium text-gray-900 truncate"
          style={{ fontSize: '14px' }}
        >
          {item.product.name}
        </p>
        <p className="text-xs text-gray-500" style={{ fontSize: '14px' }}>
          ${unitPriceDollars} each
        </p>

        {/* Discount badge */}
        {hasDiscount && (
          <p
            className="text-xs text-green-600 mt-0.5"
            style={{ fontSize: '14px' }}
            aria-label={`Discount applied: ${item.itemDiscount!.type === 'percentage' ? item.itemDiscount!.value + '%' : '$' + (item.itemDiscount!.value / 100).toFixed(2)} off`}
          >
            🏷️{' '}
            {item.itemDiscount!.type === 'percentage'
              ? `${item.itemDiscount!.value}% off`
              : `$${(item.itemDiscount!.value / 100).toFixed(2)} off`}
          </p>
        )}

        {/* Quantity error */}
        {quantityError && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-xs text-red-600 mt-1"
            style={{ fontSize: '14px' }}
          >
            ❌ {quantityError}
          </p>
        )}
      </div>

      {/* Quantity editor */}
      <div className="flex items-center gap-1">
        <label htmlFor={`qty-${item.id}`} className="sr-only">
          Quantity for {item.product.name}
        </label>
        <input
          id={`qty-${item.id}`}
          type="number"
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          value={quantityInput}
          onChange={handleQuantityChange}
          onBlur={commitQuantity}
          onKeyDown={handleQuantityKeyDown}
          aria-label={`Quantity for ${item.product.name}`}
          className="w-16 text-center border border-gray-300 rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ fontSize: '14px' }}
        />
      </div>

      {/* Line total */}
      <div className="text-right min-w-[60px]">
        {hasDiscount && (
          <p
            className="text-xs text-gray-400 line-through"
            aria-hidden="true"
            style={{ fontSize: '14px' }}
          >
            ${originalTotal}
          </p>
        )}
        <p
          className="font-semibold text-gray-900"
          style={{ fontSize: '14px' }}
          aria-label={`Line total: $${lineTotalDollars}`}
        >
          ${lineTotalDollars}
        </p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemoveItem(item.id)}
        aria-label={`Remove ${item.product.name} from cart (Delete)`}
        title="Remove item (Delete)"
        className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 rounded transition-colors"
        style={{ fontSize: '14px' }}
      >
        ✕
      </button>
    </li>
  );
};

// Memoize CartItem to prevent re-renders when other cart items change (Task 24.1)
// Only re-renders when item, onUpdateQuantity, or onRemoveItem change
export const CartItem = React.memo(CartItemComponent);
