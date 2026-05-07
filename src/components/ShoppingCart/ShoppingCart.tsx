/**
 * ShoppingCart component
 * Connected to the Zustand store for real-time cart state.
 * Computes subtotal, discounts, tax, and total from cart state on every render,
 * ensuring updates within 100ms of any cart modification (Req 4.2).
 *
 * Works in offline mode – all cart operations are local (Req 9.5).
 *
 * Performance optimizations (Task 24.1):
 * - useMemo for cart calculations to avoid recalculation on unrelated re-renders
 * - React.memo for CartItem components to prevent unnecessary re-renders
 *
 * Requirements: 4.1, 4.2, 4.7, 9.5
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { usePOSStore } from '../../store/posStore';
import type { CartItem as CartItemType } from '../../types';
import { CartHeader } from './CartHeader';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { DiscountPanel } from './DiscountPanel';
import { useCartAnnouncements } from '../../hooks/useScreenReader';

// ---------------------------------------------------------------------------
// Pure calculation helpers (no side effects, no store dependency)
// ---------------------------------------------------------------------------

function calculateSubtotal(items: CartItemType[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

function calculateCartDiscountAmount(
  subtotal: number,
  cartDiscounts: ReturnType<typeof usePOSStore.getState>['cartDiscounts']
): number {
  return cartDiscounts.reduce((sum, d) => {
    if (d.type === 'percentage') return sum + Math.round(subtotal * (d.value / 100));
    return sum + d.value;
  }, 0);
}

function calculateTax(
  items: CartItemType[],
  subtotal: number,
  cartDiscountAmount: number
): number {
  return items.reduce((sum, item) => {
    const taxable = item.lineTotal * (1 - cartDiscountAmount / (subtotal || 1));
    return sum + Math.round(taxable * item.product.taxRate);
  }, 0);
}

// ---------------------------------------------------------------------------
// ShoppingCart
// ---------------------------------------------------------------------------

export const ShoppingCart: React.FC = () => {
  // Subscribe to cart state from the Zustand store.
  // Zustand's selector-based subscriptions ensure the component re-renders
  // only when the selected slice changes, keeping updates within 100ms (Req 4.2).
  const cart = usePOSStore((s) => s.cart);
  const cartDiscounts = usePOSStore((s) => s.cartDiscounts);
  const updateQuantity = usePOSStore((s) => s.updateQuantity);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const clearCart = usePOSStore((s) => s.clearCart);
  const applyDiscount = usePOSStore((s) => s.applyDiscount);
  const removeDiscount = usePOSStore((s) => s.removeDiscount);

  // Memoize cart calculations to avoid recalculation on unrelated re-renders (Task 24.1)
  // These calculations only re-run when cart or cartDiscounts change
  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const discountAmount = useMemo(
    () => calculateCartDiscountAmount(subtotal, cartDiscounts),
    [subtotal, cartDiscounts]
  );
  const tax = useMemo(
    () => calculateTax(cart, subtotal, discountAmount),
    [cart, subtotal, discountAmount]
  );
  const total = useMemo(
    () => subtotal - discountAmount + tax,
    [subtotal, discountAmount, tax]
  );

  // Screen reader announcements for cart changes (Task 25.4)
  useCartAnnouncements(cart, total);

  // Auto-scroll to the last added item (Req 4.7 / 12.1)
  const listRef = useRef<HTMLUListElement>(null);
  const prevCartLength = useRef(cart.length);

  useEffect(() => {
    if (cart.length > prevCartLength.current && listRef.current) {
      const lastItem = listRef.current.lastElementChild;
      if (lastItem && typeof lastItem.scrollIntoView === 'function') {
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    prevCartLength.current = cart.length;
  }, [cart.length]);

  const isEmpty = cart.length === 0;

  return (
    <section
      aria-label="Shopping cart"
      className="flex flex-col border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
    >
      {/* Header */}
      <CartHeader
        itemCount={cart.length}
        isEmpty={isEmpty}
        onClearCart={clearCart}
      />

      {/* Cart items list */}
      {isEmpty ? (
        <p
          role="status"
          aria-live="polite"
          className="flex-1 flex items-center justify-center py-10 text-gray-400"
          style={{ fontSize: '14px' }}
        >
          Cart is empty
        </p>
      ) : (
        <ul
          ref={listRef}
          aria-label="Cart items"
          className="flex-1 divide-y divide-gray-100 overflow-y-auto max-h-96"
        >
          {cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
            />
          ))}
        </ul>
      )}

      {/* Summary – always visible so totals are always readable */}
      <CartSummary
        subtotal={subtotal}
        discounts={discountAmount}
        tax={tax}
        total={total}
      />

      {/* Discount panel */}
      <DiscountPanel
        cartTotal={subtotal}
        cartItems={cart}
        onApplyDiscount={applyDiscount}
        onRemoveDiscount={removeDiscount}
        cartDiscounts={cartDiscounts}
      />
    </section>
  );
};
