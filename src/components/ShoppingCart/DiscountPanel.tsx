/**
 * DiscountPanel component
 * Allows the cashier to apply percentage or fixed discounts to an item or the cart.
 * Validates that the discount does not exceed the target amount.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 5.9
 */

import React, { useState, useCallback, useId } from 'react';
import type { CartItem, Discount } from '../../types';

interface DiscountPanelProps {
  /** Current cart subtotal in cents (used for cart-level discount validation) */
  cartTotal: number;
  /** Items in the cart (for item-level discount target selection) */
  cartItems: CartItem[];
  /** Called when a valid discount is applied */
  onApplyDiscount: (discount: Discount) => void;
  /** Called when a discount is removed */
  onRemoveDiscount: (discountId: string) => void;
  /** Currently applied cart-level discounts */
  cartDiscounts: Discount[];
}

function generateId(): string {
  return crypto.randomUUID();
}

export const DiscountPanel: React.FC<DiscountPanelProps> = ({
  cartTotal,
  cartItems,
  onApplyDiscount,
  onRemoveDiscount,
  cartDiscounts,
}) => {
  const uid = useId();

  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountTarget, setDiscountTarget] = useState<'cart' | 'item'>('cart');
  const [discountValue, setDiscountValue] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  /** Compute preview discount amount in cents */
  const computePreview = useCallback(
    (type: 'percentage' | 'fixed', value: number, target: 'cart' | 'item', itemId: string) => {
      if (isNaN(value) || value <= 0) return null;

      if (target === 'cart') {
        if (type === 'percentage') return Math.round(cartTotal * (value / 100));
        return Math.min(value * 100, cartTotal); // value entered in dollars → cents
      }

      const item = cartItems.find((i) => i.id === itemId);
      if (!item) return null;
      if (type === 'percentage') return Math.round(item.lineTotal * (value / 100));
      return Math.min(value * 100, item.lineTotal);
    },
    [cartTotal, cartItems]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDiscountValue(raw);
      setError(null);

      const num = parseFloat(raw);
      setPreview(computePreview(discountType, num, discountTarget, selectedItemId));
    },
    [discountType, discountTarget, selectedItemId, computePreview]
  );

  const handleApply = useCallback(() => {
    setError(null);
    const num = parseFloat(discountValue);

    if (isNaN(num) || num <= 0) {
      setError('Please enter a positive discount value.');
      return;
    }

    if (discountType === 'percentage' && (num < 0 || num > 100)) {
      setError('Percentage discount must be between 0 and 100.');
      return;
    }

    // Determine target amount in cents
    let targetAmount: number;
    if (discountTarget === 'cart') {
      targetAmount = cartTotal;
    } else {
      const item = cartItems.find((i) => i.id === selectedItemId);
      if (!item) {
        setError('Please select an item to apply the discount to.');
        return;
      }
      targetAmount = item.lineTotal;
    }

    // For fixed discounts, value is entered in dollars → convert to cents
    const valueInCents = discountType === 'fixed' ? Math.round(num * 100) : num;

    // Validate: fixed discount cannot exceed target (Req 5.8)
    if (discountType === 'fixed' && valueInCents > targetAmount) {
      setError('Discount cannot exceed total.');
      return;
    }

    const discount: Discount = {
      id: generateId(),
      type: discountType,
      value: valueInCents,
      target: discountTarget,
      targetItemId: discountTarget === 'item' ? selectedItemId : undefined,
      appliedAt: Date.now(),
    };

    onApplyDiscount(discount);

    // Reset form
    setDiscountValue('');
    setPreview(null);
    setError(null);
  }, [discountValue, discountType, discountTarget, selectedItemId, cartTotal, cartItems, onApplyDiscount]);

  const previewDollars = preview !== null ? (preview / 100).toFixed(2) : null;

  return (
    <div
      className="px-4 py-3 border-t border-gray-200 space-y-3"
      aria-label="Discount panel"
    >
      <h3 className="font-semibold text-gray-700" style={{ fontSize: '14px' }}>
        Apply Discount
      </h3>

      {/* Discount type */}
      <div className="flex gap-3" role="group" aria-label="Discount type">
        {(['percentage', 'fixed'] as const).map((type) => (
          <label
            key={type}
            className="flex items-center gap-1 cursor-pointer"
            style={{ fontSize: '14px' }}
          >
            <input
              type="radio"
              name={`${uid}-discount-type`}
              value={type}
              checked={discountType === type}
              onChange={() => {
                setDiscountType(type);
                setDiscountValue('');
                setPreview(null);
                setError(null);
              }}
              className="accent-blue-600"
            />
            {type === 'percentage' ? 'Percentage (%)' : 'Fixed ($)'}
          </label>
        ))}
      </div>

      {/* Discount target */}
      <div className="flex gap-3" role="group" aria-label="Discount target">
        {(['cart', 'item'] as const).map((target) => (
          <label
            key={target}
            className="flex items-center gap-1 cursor-pointer"
            style={{ fontSize: '14px' }}
          >
            <input
              type="radio"
              name={`${uid}-discount-target`}
              value={target}
              checked={discountTarget === target}
              onChange={() => {
                setDiscountTarget(target);
                setDiscountValue('');
                setPreview(null);
                setError(null);
              }}
              className="accent-blue-600"
            />
            {target === 'cart' ? 'Entire cart' : 'Specific item'}
          </label>
        ))}
      </div>

      {/* Item selector (only when target === 'item') */}
      {discountTarget === 'item' && (
        <div>
          <label
            htmlFor={`${uid}-item-select`}
            className="block text-sm text-gray-600 mb-1"
            style={{ fontSize: '14px' }}
          >
            Select item
          </label>
          <select
            id={`${uid}-item-select`}
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setPreview(null);
              setError(null);
            }}
            className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ fontSize: '14px' }}
          >
            <option value="">-- choose item --</option>
            {cartItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product.name} (${(item.lineTotal / 100).toFixed(2)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Discount value input */}
      <div>
        <label
          htmlFor={`${uid}-discount-value`}
          className="block text-sm text-gray-600 mb-1"
          style={{ fontSize: '14px' }}
        >
          {discountType === 'percentage' ? 'Discount (%)' : 'Discount amount ($)'}
        </label>
        <input
          id={`${uid}-discount-value`}
          type="number"
          min={0}
          max={discountType === 'percentage' ? 100 : undefined}
          step={discountType === 'percentage' ? 1 : 0.01}
          value={discountValue}
          onChange={handleValueChange}
          placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
          aria-label={discountType === 'percentage' ? 'Discount percentage' : 'Discount amount in dollars'}
          className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ fontSize: '14px' }}
        />
      </div>

      {/* Preview */}
      {previewDollars !== null && (
        <p
          className="text-sm text-green-600"
          aria-live="polite"
          style={{ fontSize: '14px' }}
        >
          Preview: -${previewDollars} off
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-sm text-red-600"
          style={{ fontSize: '14px' }}
        >
          ❌ {error}
        </p>
      )}

      {/* Apply button */}
      <button
        type="button"
        onClick={handleApply}
        disabled={!discountValue || cartTotal === 0}
        aria-label="Apply discount"
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontSize: '14px' }}
      >
        Apply Discount
      </button>

      {/* Applied cart-level discounts (Req 5.9) */}
      {cartDiscounts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium" style={{ fontSize: '14px' }}>
            Applied cart discounts:
          </p>
          {cartDiscounts.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between text-sm text-green-700 bg-green-50 rounded px-2 py-1"
              style={{ fontSize: '14px' }}
            >
              <span>
                {d.type === 'percentage' ? `${d.value}%` : `$${(d.value / 100).toFixed(2)}`} off cart
              </span>
              <button
                type="button"
                onClick={() => onRemoveDiscount(d.id)}
                aria-label={`Remove ${d.type === 'percentage' ? d.value + '%' : '$' + (d.value / 100).toFixed(2)} cart discount`}
                className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400 rounded"
                style={{ fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
