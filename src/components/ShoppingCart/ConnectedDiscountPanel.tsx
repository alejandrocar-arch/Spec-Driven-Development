/**
 * ConnectedDiscountPanel
 *
 * A store-connected wrapper around DiscountPanel that reads cart state and
 * discount actions directly from the Zustand store.  It can be used
 * standalone without requiring a parent component to pass props.
 *
 * Offline mode is fully supported – all discount operations are local and
 * do not require network connectivity (Req 9.6).
 *
 * Requirements: 9.6
 */

import React from 'react';
import { usePOSStore } from '../../store/posStore';
import { DiscountPanel } from './DiscountPanel';

/**
 * ConnectedDiscountPanel reads cart state and discount actions from the
 * Zustand store and forwards them to the presentational DiscountPanel.
 *
 * Because Zustand selectors are used, the component only re-renders when
 * the relevant slices of state change, keeping updates within 100ms.
 */
export const ConnectedDiscountPanel: React.FC = () => {
  // Select only the slices we need to minimise re-renders.
  const cart = usePOSStore((s) => s.cart);
  const cartDiscounts = usePOSStore((s) => s.cartDiscounts);
  const applyDiscount = usePOSStore((s) => s.applyDiscount);
  const removeDiscount = usePOSStore((s) => s.removeDiscount);

  // Compute the cart subtotal (in cents) to pass as cartTotal.
  // This mirrors the calculation used in ShoppingCart so the discount
  // validation is consistent.
  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <DiscountPanel
      cartTotal={cartTotal}
      cartItems={cart}
      onApplyDiscount={applyDiscount}
      onRemoveDiscount={removeDiscount}
      cartDiscounts={cartDiscounts}
    />
  );
};
