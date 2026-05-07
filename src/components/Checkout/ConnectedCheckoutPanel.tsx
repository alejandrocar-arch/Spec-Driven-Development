/**
 * ConnectedCheckoutPanel
 *
 * A store-connected wrapper around CheckoutPanel that reads cart state and
 * calls the checkout action directly from the Zustand store.
 *
 * Offline mode is fully supported (Req 9.7, 9.8):
 * - The checkout action always runs locally, creating a transaction with
 *   syncStatus='pending' regardless of connectivity.
 * - The transaction will be synced to the backend when connectivity is
 *   restored (handled by the SyncService).
 *
 * Requirements: 9.7, 9.8
 */

import React, { useCallback } from 'react';
import { usePOSStore } from '../../store/posStore';
import { CheckoutPanel } from './CheckoutPanel';
import type { Payment, Transaction } from '../../types';

/**
 * ConnectedCheckoutPanel reads cart state and the checkout action from the
 * Zustand store and forwards them to the presentational CheckoutPanel.
 *
 * Because Zustand selectors are used, the component only re-renders when
 * the relevant slices of state change.
 */
export const ConnectedCheckoutPanel: React.FC = () => {
  // Select only the slices we need to minimise re-renders.
  const cart = usePOSStore((s) => s.cart);
  const cartDiscounts = usePOSStore((s) => s.cartDiscounts);
  const isOnline = usePOSStore((s) => s.isOnline);
  const checkoutAction = usePOSStore((s) => s.checkout);

  // Compute the final total to display in the checkout panel.
  // This mirrors the calculation in the store's checkout action so the
  // displayed total is always consistent with what will be charged.
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const cartDiscount = cartDiscounts.reduce((sum, d) => {
    if (d.type === 'percentage') return sum + Math.round(subtotal * (d.value / 100));
    return sum + d.value;
  }, 0);
  const taxAmount = cart.reduce((sum, item) => {
    const taxable = item.lineTotal * (1 - cartDiscount / (subtotal || 1));
    return sum + Math.round(taxable * item.product.taxRate);
  }, 0);
  const total = subtotal - cartDiscount + taxAmount;

  const hasItems = cart.length > 0;

  /**
   * Wraps the store's checkout action.
   *
   * Works in both online and offline modes:
   * - Online: transaction is saved locally with syncStatus='pending' and the
   *   SyncService will upload it in the background.
   * - Offline: transaction is saved locally with syncStatus='pending' and
   *   will be uploaded when connectivity is restored (Req 9.7, 9.8).
   */
  const handleCheckout = useCallback(
    async (payment: Payment): Promise<Transaction> => {
      return checkoutAction(payment);
    },
    [checkoutAction]
  );

  return (
    <CheckoutPanel
      total={total}
      hasItems={hasItems}
      isOnline={isOnline}
      onCheckout={handleCheckout}
    />
  );
};
