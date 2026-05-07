/**
 * Tests for ShoppingCart and its sub-components.
 * Verifies store integration, real-time totals, offline mode, and cart actions.
 *
 * Requirements: 4.2, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShoppingCart } from './ShoppingCart';
import { CartSummary } from './CartSummary';
import { CartHeader } from './CartHeader';
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
    price: 150,       // $1.50
    taxRate: 0.1,     // 10%
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
// CartSummary unit tests
// ---------------------------------------------------------------------------

describe('CartSummary', () => {
  it('displays subtotal, tax, and total', () => {
    render(<CartSummary subtotal={1000} discounts={0} tax={100} total={1100} />);
    expect(screen.getByLabelText('Subtotal: $10.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Tax: $1.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Total: $11.00')).toBeInTheDocument();
  });

  it('shows discounts row only when discounts > 0', () => {
    const { rerender } = render(
      <CartSummary subtotal={1000} discounts={0} tax={100} total={1100} />
    );
    expect(screen.queryByLabelText(/discounts/i)).not.toBeInTheDocument();

    rerender(<CartSummary subtotal={1000} discounts={200} tax={80} total={880} />);
    expect(screen.getByLabelText(/discounts/i)).toHaveTextContent('-$2.00');
  });

  it('formats cents to dollars correctly', () => {
    render(<CartSummary subtotal={199} discounts={0} tax={20} total={219} />);
    expect(screen.getByLabelText('Subtotal: $1.99')).toBeInTheDocument();
    expect(screen.getByLabelText('Total: $2.19')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CartHeader unit tests
// ---------------------------------------------------------------------------

describe('CartHeader', () => {
  it('displays item count', () => {
    render(<CartHeader itemCount={3} isEmpty={false} onClearCart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Cart');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disables clear button when cart is empty', () => {
    render(<CartHeader itemCount={0} isEmpty={true} onClearCart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /clear cart/i })).toBeDisabled();
  });

  it('calls onClearCart after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onClear = vi.fn();
    render(<CartHeader itemCount={2} isEmpty={false} onClearCart={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('does not call onClearCart when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onClear = vi.fn();
    render(<CartHeader itemCount={2} isEmpty={false} onClearCart={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));
    expect(onClear).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// ShoppingCart – store integration
// ---------------------------------------------------------------------------

describe('ShoppingCart – store integration', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders empty cart message when cart is empty', () => {
    render(<ShoppingCart />);
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });

  it('renders cart items from the store', () => {
    const item = makeCartItem({ product: makeProduct({ name: 'Banana', price: 200 }) });
    usePOSStore.setState({ cart: [item] });

    render(<ShoppingCart />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('displays correct subtotal, tax, and total from store state (Req 4.2)', () => {
    // price=200 cents, qty=2, taxRate=0.1 → lineTotal=400, tax=40, total=440
    const item = makeCartItem({
      id: 'item-1',
      product: makeProduct({ price: 200, taxRate: 0.1 }),
      quantity: 2,
      lineTotal: 400,
    });
    usePOSStore.setState({ cart: [item], cartDiscounts: [] });

    render(<ShoppingCart />);

    expect(screen.getByLabelText('Subtotal: $4.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Tax: $0.40')).toBeInTheDocument();
    expect(screen.getByLabelText('Total: $4.40')).toBeInTheDocument();
  });

  it('updates totals in real-time when cart changes (Req 4.2)', async () => {
    render(<ShoppingCart />);

    // Initially empty
    expect(screen.getByLabelText('Total: $0.00')).toBeInTheDocument();

    // Add item via store action
    const product = makeProduct({ price: 500, taxRate: 0 });
    await act(async () => {
      usePOSStore.getState().addToCart(product, 1);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Total: $5.00')).toBeInTheDocument();
    });
  });

  it('removes item from cart when remove button is clicked', async () => {
    const item = makeCartItem({ product: makeProduct({ name: 'Cherry' }) });
    usePOSStore.setState({ cart: [item] });

    render(<ShoppingCart />);
    expect(screen.getByText('Cherry')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove cherry/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
      expect(usePOSStore.getState().cart).toHaveLength(0);
    });
  });

  it('clears cart when clear button is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const item1 = makeCartItem({ id: 'i1', product: makeProduct({ id: 'p1', name: 'Apple' }) });
    const item2 = makeCartItem({ id: 'i2', product: makeProduct({ id: 'p2', name: 'Banana' }) });
    usePOSStore.setState({ cart: [item1, item2] });

    render(<ShoppingCart />);
    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cart).toHaveLength(0);
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// ShoppingCart – quantity updates
// ---------------------------------------------------------------------------

describe('ShoppingCart – quantity updates', () => {
  beforeEach(() => {
    resetStore();
  });

  it('updates quantity in store when quantity input changes', async () => {
    const item = makeCartItem({
      id: 'item-1',
      product: makeProduct({ name: 'Mango', price: 300 }),
      quantity: 1,
      lineTotal: 300,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ShoppingCart />);

    const qtyInput = screen.getByLabelText(/quantity for mango/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '3');
    fireEvent.blur(qtyInput);

    await waitFor(() => {
      expect(usePOSStore.getState().cart[0].quantity).toBe(3);
    });
  });

  it('removes item when quantity is set to 0', async () => {
    const item = makeCartItem({
      id: 'item-1',
      product: makeProduct({ name: 'Grape' }),
      quantity: 2,
      lineTotal: 300,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ShoppingCart />);

    const qtyInput = screen.getByLabelText(/quantity for grape/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '0');
    fireEvent.blur(qtyInput);

    await waitFor(() => {
      expect(usePOSStore.getState().cart).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// ShoppingCart – discount application
// ---------------------------------------------------------------------------

describe('ShoppingCart – discount application', () => {
  beforeEach(() => {
    resetStore();
  });

  it('applies a percentage cart discount and updates totals', async () => {
    // price=1000 cents, qty=1, taxRate=0 → subtotal=1000
    const item = makeCartItem({
      product: makeProduct({ price: 1000, taxRate: 0 }),
      quantity: 1,
      lineTotal: 1000,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ShoppingCart />);

    // Type the discount value (percentage, cart target are defaults)
    const valueInput = screen.getByLabelText(/discount percentage/i);
    await user.type(valueInput, '10');

    // Button should now be enabled
    const applyBtn = screen.getByRole('button', { name: /apply discount/i });
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      // 10% of $10.00 = $1.00 discount → total = $9.00
      expect(screen.getByLabelText('Discounts: -$1.00')).toBeInTheDocument();
      expect(screen.getByLabelText('Total: $9.00')).toBeInTheDocument();
    });
  });

  it('shows error when fixed discount exceeds cart total', async () => {
    const item = makeCartItem({
      product: makeProduct({ price: 500, taxRate: 0 }),
      quantity: 1,
      lineTotal: 500,
    });
    usePOSStore.setState({ cart: [item] });

    const user = userEvent.setup({ delay: null });
    render(<ShoppingCart />);

    // Switch to fixed discount
    fireEvent.click(screen.getByDisplayValue('fixed'));

    const valueInput = screen.getByLabelText(/discount amount in dollars/i);
    await user.type(valueInput, '100'); // $100 > $5.00 cart total

    const applyBtn = screen.getByRole('button', { name: /apply discount/i });
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/discount cannot exceed total/i);
    });
  });

  it('removes a cart discount when remove button is clicked', async () => {
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

    render(<ShoppingCart />);

    // The discount should be listed
    expect(screen.getByText(/10% off cart/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove 10% cart discount/i }));

    await waitFor(() => {
      expect(usePOSStore.getState().cartDiscounts).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// ShoppingCart – offline mode (Req 9.5)
// ---------------------------------------------------------------------------

describe('ShoppingCart – offline mode (Req 9.5)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('cart management works when store.isOnline is false', async () => {
    usePOSStore.setState({ isOnline: false });

    render(<ShoppingCart />);

    // Add item via store action (simulates offline cart operation)
    const product = makeProduct({ price: 300, taxRate: 0 });
    await act(async () => {
      usePOSStore.getState().addToCart(product, 2);
    });

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByLabelText('Total: $6.00')).toBeInTheDocument();
    });
  });

  it('quantity updates work when offline', async () => {
    usePOSStore.setState({ isOnline: false });

    const item = makeCartItem({
      id: 'item-1',
      product: makeProduct({ name: 'Pear', price: 200 }),
      quantity: 1,
      lineTotal: 200,
    });
    usePOSStore.setState({ cart: [item], isOnline: false });

    const user = userEvent.setup({ delay: null });
    render(<ShoppingCart />);

    const qtyInput = screen.getByLabelText(/quantity for pear/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');
    fireEvent.blur(qtyInput);

    await waitFor(() => {
      expect(usePOSStore.getState().cart[0].quantity).toBe(5);
    });
  });
});
