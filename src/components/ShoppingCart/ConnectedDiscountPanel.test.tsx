/**
 * Tests for ConnectedDiscountPanel.
 *
 * Verifies that the component reads cart state and discount actions directly
 * from the Zustand store and works correctly in both online and offline modes.
 *
 * Requirements: 9.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectedDiscountPanel } from './ConnectedDiscountPanel';
import { usePOSStore } from '../../store/posStore';
import type { Product, CartItem, Discount } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    barcode: '1234567890123',
    name: 'Apple',
    category: 'Fruit',
    price: 1000, // $10.00
    taxRate: 0.1,
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
// ConnectedDiscountPanel – store integration
// ---------------------------------------------------------------------------

describe('ConnectedDiscountPanel – store integration', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the discount panel', () => {
    render(<ConnectedDiscountPanel />);
    expect(screen.getByRole('button', { name: /apply discount/i })).toBeInTheDocument();
  });

  it('apply button is disabled when cart is empty', () => {
    render(<ConnectedDiscountPanel />);
    expect(screen.getByRole('button', { name: /apply discount/i })).toBeDisabled();
  });

  it('apply button is enabled when cart has items and a value is entered', async () => {
    const item = makeCartItem({ product: makeProduct({ price: 1000 }), lineTotal: 1000 });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedDiscountPanel />);

    const valueInput = screen.getByLabelText(/discount percentage/i);
    await user.type(valueInput, '10');

    expect(screen.getByRole('button', { name: /apply discount/i })).not.toBeDisabled();
  });

  it('applies a percentage cart discount to the store', async () => {
    // price=1000 cents, qty=1, taxRate=0 → subtotal=1000
    const item = makeCartItem({
      product: makeProduct({ price: 1000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 1000,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedDiscountPanel />);

    const valueInput = screen.getByLabelText(/discount percentage/i);
    await user.type(valueInput, '10');
    fireEvent.click(screen.getByRole('button', { name: /apply discount/i }));

    await waitFor(() => {
      const { cartDiscounts } = usePOSStore.getState();
      expect(cartDiscounts).toHaveLength(1);
      expect(cartDiscounts[0].type).toBe('percentage');
      expect(cartDiscounts[0].value).toBe(10);
      expect(cartDiscounts[0].target).toBe('cart');
    });
  });

  it('applies a fixed cart discount to the store', async () => {
    const item = makeCartItem({
      product: makeProduct({ price: 2000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 2000,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedDiscountPanel />);

    // Switch to fixed discount
    fireEvent.click(screen.getByDisplayValue('fixed'));

    const valueInput = screen.getByLabelText(/discount amount in dollars/i);
    await user.type(valueInput, '5');
    fireEvent.click(screen.getByRole('button', { name: /apply discount/i }));

    await waitFor(() => {
      const { cartDiscounts } = usePOSStore.getState();
      expect(cartDiscounts).toHaveLength(1);
      expect(cartDiscounts[0].type).toBe('fixed');
      expect(cartDiscounts[0].value).toBe(500); // $5.00 → 500 cents
    });
  });

  it('shows validation error when fixed discount exceeds cart total', async () => {
    const item = makeCartItem({
      product: makeProduct({ price: 500, taxRate: 0 }),
      quantity: 1,
      lineTotal: 500,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedDiscountPanel />);

    fireEvent.click(screen.getByDisplayValue('fixed'));

    const valueInput = screen.getByLabelText(/discount amount in dollars/i);
    await user.type(valueInput, '100'); // $100 > $5.00 cart total

    fireEvent.click(screen.getByRole('button', { name: /apply discount/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/discount cannot exceed total/i);
    });

    // Store should not have been updated
    expect(usePOSStore.getState().cartDiscounts).toHaveLength(0);
  });

  it('removes a cart discount from the store', async () => {
    const discount: Discount = {
      id: 'disc-1',
      type: 'percentage',
      value: 10,
      target: 'cart',
      appliedAt: Date.now(),
    };
    const item = makeCartItem({
      product: makeProduct({ price: 1000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 1000,
    });
    usePOSStore.setState({ cart: [item], cartDiscounts: [discount] });

    render(<ConnectedDiscountPanel />);

    expect(screen.getByText(/10% off cart/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove 10% cart discount/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cartDiscounts).toHaveLength(0);
    });
  });

  it('lists cart items in the item selector', () => {
    const item1 = makeCartItem({
      id: 'i1',
      product: makeProduct({ id: 'p1', name: 'Apple', price: 500 }),
      lineTotal: 500,
    });
    const item2 = makeCartItem({
      id: 'i2',
      product: makeProduct({ id: 'p2', name: 'Banana', price: 300 }),
      lineTotal: 300,
    });
    usePOSStore.setState({ cart: [item1, item2] });

    render(<ConnectedDiscountPanel />);

    // Switch to item target to reveal the item selector
    fireEvent.click(screen.getByDisplayValue('item'));

    expect(screen.getByText(/Apple/)).toBeInTheDocument();
    expect(screen.getByText(/Banana/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConnectedDiscountPanel – offline mode (Req 9.6)
// ---------------------------------------------------------------------------

describe('ConnectedDiscountPanel – offline mode (Req 9.6)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('discount application works when store.isOnline is false', async () => {
    const item = makeCartItem({
      product: makeProduct({ price: 1000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 1000,
    });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ConnectedDiscountPanel />);

    const valueInput = screen.getByLabelText(/discount percentage/i);
    await user.type(valueInput, '20');
    fireEvent.click(screen.getByRole('button', { name: /apply discount/i }));

    await waitFor(() => {
      const { cartDiscounts } = usePOSStore.getState();
      expect(cartDiscounts).toHaveLength(1);
      expect(cartDiscounts[0].value).toBe(20);
    });
  });

  it('discount removal works when store.isOnline is false', async () => {
    const discount: Discount = {
      id: 'disc-offline',
      type: 'fixed',
      value: 200,
      target: 'cart',
      appliedAt: Date.now(),
    };
    const item = makeCartItem({
      product: makeProduct({ price: 1000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 1000,
    });
    usePOSStore.setState({ cart: [item], cartDiscounts: [discount], isOnline: false });

    render(<ConnectedDiscountPanel />);

    fireEvent.click(screen.getByRole('button', { name: /remove.*cart discount/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cartDiscounts).toHaveLength(0);
    });
  });
});
