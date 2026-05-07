/**
 * Tests for ConnectedCheckoutPanel.
 *
 * Verifies that the component reads cart state and calls the checkout action
 * from the Zustand store, and that offline checkout works correctly.
 *
 * Requirements: 9.7, 9.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectedCheckoutPanel } from './ConnectedCheckoutPanel';
import { usePOSStore } from '../../store/posStore';
import type { Product, CartItem, Transaction } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    barcode: '1234567890123',
    name: 'Apple',
    category: 'Fruit',
    price: 1000, // $10.00 in cents
    taxRate: 0,
    lastUpdated: Date.now(),
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = makeProduct(overrides.product ?? {});
  const quantity = overrides.quantity ?? 1;
  return {
    id: 'item-1',
    product,
    quantity,
    lineTotal: product.price * quantity,
    ...overrides,
  };
}

function resetStore() {
  usePOSStore.setState({
    products: [],
    productIndex: new Map(),
    cart: [],
    cartDiscounts: [],
    transactions: [],
    currentTransaction: null,
    isOnline: true,
    isSyncing: false,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// ConnectedCheckoutPanel – store integration
// ---------------------------------------------------------------------------

describe('ConnectedCheckoutPanel – store integration', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the checkout button', () => {
    render(<ConnectedCheckoutPanel />);
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
  });

  it('checkout button is disabled when cart is empty', () => {
    render(<ConnectedCheckoutPanel />);
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeDisabled();
  });

  it('checkout button is enabled when cart has items', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).not.toBeDisabled();
  });

  it('opens checkout modal when button is clicked', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(screen.getByRole('dialog', { name: /checkout/i })).toBeInTheDocument();
  });

  it('displays the correct total in the checkout modal', () => {
    // price=1000 cents, qty=2, taxRate=0 → total=2000 cents = $20.00
    const item = makeCartItem({ quantity: 2, lineTotal: 2000 });
    usePOSStore.setState({ cart: [item] });

    render(<ConnectedCheckoutPanel />);
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    // The CashPaymentForm shows the total
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });

  it('completes a cash checkout and shows receipt', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    // Open checkout
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    // Enter amount tendered
    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');

    // Complete payment
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    // Receipt should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /receipt/i })).toBeInTheDocument();
    });
  });

  it('clears the cart after successful checkout', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cart).toHaveLength(0);
    });
  });

  it('saves transaction to store after checkout', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      const { transactions } = usePOSStore.getState();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].payment.method).toBe('cash');
    });
  });

  it('transaction has syncStatus pending after checkout', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      const { transactions } = usePOSStore.getState();
      expect(transactions[0].syncStatus).toBe('pending');
    });
  });

  it('can switch payment method to credit card', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    fireEvent.click(screen.getByRole('button', { name: /pay with credit/i }));

    // CardPaymentForm renders a Confirm Payment button for credit
    expect(screen.getByRole('button', { name: /confirm credit card payment/i })).toBeInTheDocument();
  });

  it('can switch payment method to debit card', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    fireEvent.click(screen.getByRole('button', { name: /pay with debit/i }));

    // CardPaymentForm renders a Confirm Payment button for debit
    expect(screen.getByRole('button', { name: /confirm debit card payment/i })).toBeInTheDocument();
  });

  it('closes checkout modal on cancel', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    expect(screen.getByRole('dialog', { name: /checkout/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close checkout/i }));
    expect(screen.queryByRole('dialog', { name: /checkout/i })).not.toBeInTheDocument();
  });

  it('opens checkout with Ctrl+Enter keyboard shortcut', () => {
    usePOSStore.setState({ cart: [makeCartItem()] });
    render(<ConnectedCheckoutPanel />);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: /checkout/i })).toBeInTheDocument();
  });

  it('Ctrl+Enter does nothing when cart is empty', () => {
    render(<ConnectedCheckoutPanel />);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(screen.queryByRole('dialog', { name: /checkout/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConnectedCheckoutPanel – offline mode (Req 9.7, 9.8)
// ---------------------------------------------------------------------------

describe('ConnectedCheckoutPanel – offline mode (Req 9.7, 9.8)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows offline notice when store.isOnline is false', () => {
    usePOSStore.setState({ cart: [makeCartItem()], isOnline: false });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/offline mode/i);
  });

  it('checkout completes successfully when offline (Req 9.7)', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    // Receipt should appear even when offline
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /receipt/i })).toBeInTheDocument();
    });
  });

  it('offline transaction is saved with syncStatus pending (Req 9.8)', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      const { transactions } = usePOSStore.getState();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].syncStatus).toBe('pending');
    });
  });

  it('cart is cleared after offline checkout', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cart).toHaveLength(0);
    });
  });

  it('receipt shows offline notice when offline', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 1000 });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /receipt/i })).toBeInTheDocument();
    });

    // The receipt should show an offline notice
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('checkout with cart discount works offline', async () => {
    const item = makeCartItem({ quantity: 1, lineTotal: 2000 });
    usePOSStore.setState({
      cart: [item],
      cartDiscounts: [
        {
          id: 'disc-1',
          type: 'percentage',
          value: 10,
          target: 'cart',
          appliedAt: Date.now(),
        },
      ],
      isOnline: false,
    });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedCheckoutPanel />);

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    // Total should be $18.00 (10% off $20.00)
    expect(screen.getByText('$18.00')).toBeInTheDocument();

    const amountInput = screen.getByLabelText(/amount tendered in dollars/i);
    await user.type(amountInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /complete cash payment/i }));

    await waitFor(() => {
      const { transactions } = usePOSStore.getState();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].cartDiscount).toBe(200); // 10% of 2000 = 200 cents
    });
  });
});
