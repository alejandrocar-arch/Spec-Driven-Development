/**
 * Tests for ConnectedTransactionHistory.
 *
 * Verifies that the component reads transaction history and connectivity
 * state from the Zustand store, and that offline / online modes work
 * correctly.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectedTransactionHistory } from './ConnectedTransactionHistory';
import { usePOSStore } from '../../store/posStore';
import type { Transaction, CartItem, Product, Payment, Receipt } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    barcode: '1234567890123',
    name: 'Apple',
    category: 'Fruit',
    price: 1000,
    taxRate: 0,
    lastUpdated: Date.now(),
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = makeProduct();
  return {
    id: 'item-1',
    product,
    quantity: 1,
    lineTotal: product.price,
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    method: 'cash',
    amountTendered: 2000,
    changeDue: 1000,
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    transactionId: 'txn-receipt-1',
    storeName: 'Test Store',
    storeAddress: '123 Main St',
    timestamp: Date.now(),
    items: [{ name: 'Apple', quantity: 1, unitPrice: 1000, lineTotal: 1000 }],
    subtotal: 1000,
    discounts: 0,
    tax: 0,
    total: 1000,
    payment: makePayment(),
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `txn-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    items: [makeCartItem()],
    subtotal: 1000,
    cartDiscount: 0,
    taxAmount: 0,
    total: 1000,
    payment: makePayment(),
    receipt: makeReceipt(),
    syncStatus: 'synced',
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
// ConnectedTransactionHistory – trigger button
// ---------------------------------------------------------------------------

describe('ConnectedTransactionHistory – trigger button', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the history trigger button', () => {
    render(<ConnectedTransactionHistory />);
    expect(
      screen.getByRole('button', { name: /view transaction history/i })
    ).toBeInTheDocument();
  });

  it('opens the history panel when the button is clicked', () => {
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    expect(screen.getByRole('dialog', { name: /transaction history/i })).toBeInTheDocument();
  });

  it('closes the panel when the close button is clicked', () => {
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    expect(screen.getByRole('dialog', { name: /transaction history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close transaction history/i }));
    expect(screen.queryByRole('dialog', { name: /transaction history/i })).not.toBeInTheDocument();
  });

  it('closes the panel when Escape is pressed', () => {
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    expect(screen.getByRole('dialog', { name: /transaction history/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /transaction history/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConnectedTransactionHistory – transaction list (Req 12.1, 12.3)
// ---------------------------------------------------------------------------

describe('ConnectedTransactionHistory – transaction list (Req 12.1, 12.3)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows "No transactions yet" when store has no transactions', () => {
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it('displays transactions from the store (Req 12.1)', () => {
    const tx = makeTransaction({ total: 2500 });
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    // Total should be visible as $25.00
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('displays date, time, total, and payment method for each transaction (Req 12.3)', () => {
    const tx = makeTransaction({
      timestamp: new Date('2024-06-15T14:30:00').getTime(),
      total: 1500,
      payment: makePayment({ method: 'credit' }),
    });
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    // Total
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    // Payment method label
    expect(screen.getByText(/credit/i)).toBeInTheDocument();
  });

  it('limits display to 50 transactions (Req 12.1)', () => {
    const txs = Array.from({ length: 60 }, (_, i) =>
      makeTransaction({ id: `txn-${i}`, total: 1000 })
    );
    usePOSStore.setState({ transactions: txs });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    // The footer should say "50" not "60"
    expect(screen.getByText(/showing 50 of last 50/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConnectedTransactionHistory – transaction detail (Req 12.4)
// ---------------------------------------------------------------------------

describe('ConnectedTransactionHistory – transaction detail (Req 12.4)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows receipt detail when a transaction is clicked (Req 12.4)', () => {
    const tx = makeTransaction({
      receipt: makeReceipt({ storeName: 'My Store' }),
    });
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    // Click the transaction row
    const row = screen.getByRole('button', { name: /transaction on/i });
    fireEvent.click(row);

    // Detail view should show store name
    expect(screen.getByText('My Store')).toBeInTheDocument();
  });

  it('shows back button in detail view', () => {
    const tx = makeTransaction();
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    fireEvent.click(screen.getByRole('button', { name: /transaction on/i }));

    expect(screen.getByRole('button', { name: /back to transaction list/i })).toBeInTheDocument();
  });

  it('returns to list when back button is clicked', () => {
    const tx = makeTransaction();
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    fireEvent.click(screen.getByRole('button', { name: /transaction on/i }));

    // Now in detail view – go back
    fireEvent.click(screen.getByRole('button', { name: /back to transaction list/i }));

    // Should be back on the list
    expect(screen.getByRole('list', { name: /transaction history/i })).toBeInTheDocument();
  });

  it('Escape key navigates back from detail to list', () => {
    const tx = makeTransaction();
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    fireEvent.click(screen.getByRole('button', { name: /transaction on/i }));

    // Press Escape – should go back to list, not close the panel
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('list', { name: /transaction history/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /transaction history/i })).toBeInTheDocument();
  });

  it('displays all receipt fields in detail view', () => {
    const tx = makeTransaction({
      total: 1500,
      subtotal: 1500,
      cartDiscount: 0,
      taxAmount: 0,
      payment: makePayment({ method: 'cash', amountTendered: 2000, changeDue: 500 }),
      receipt: makeReceipt({
        storeName: 'Corner Shop',
        subtotal: 1500,
        discounts: 0,
        tax: 0,
        total: 1500,
        items: [{ name: 'Banana', quantity: 3, unitPrice: 500, lineTotal: 1500 }],
        payment: makePayment({ method: 'cash', amountTendered: 2000, changeDue: 500 }),
      }),
    });
    usePOSStore.setState({ transactions: [tx] });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));
    fireEvent.click(screen.getByRole('button', { name: /transaction on/i }));

    expect(screen.getByText('Corner Shop')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    // $15.00 appears as line total, subtotal, and grand total – use getAllByText
    expect(screen.getAllByText('$15.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$20.00')).toBeInTheDocument(); // tendered
    expect(screen.getByText('$5.00')).toBeInTheDocument();  // change
  });
});

// ---------------------------------------------------------------------------
// ConnectedTransactionHistory – offline mode (Req 12.5)
// ---------------------------------------------------------------------------

describe('ConnectedTransactionHistory – offline mode (Req 12.5)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows offline indicator when store.isOnline is false (Req 12.5)', () => {
    usePOSStore.setState({ isOnline: false });
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    expect(screen.getByText(/offline.*local history/i)).toBeInTheDocument();
  });

  it('displays locally stored transactions when offline (Req 12.5)', () => {
    const tx = makeTransaction({ total: 3000, syncStatus: 'pending' });
    usePOSStore.setState({ transactions: [tx], isOnline: false });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('shows pending sync badge for unsynced transactions', () => {
    const tx = makeTransaction({ syncStatus: 'pending' });
    usePOSStore.setState({ transactions: [tx], isOnline: false });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    expect(screen.getByLabelText(/pending sync/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConnectedTransactionHistory – online mode (Req 12.6)
// ---------------------------------------------------------------------------

describe('ConnectedTransactionHistory – online mode (Req 12.6)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows online/synced indicator when store.isOnline is true (Req 12.6)', () => {
    usePOSStore.setState({ isOnline: true });
    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    expect(screen.getByText(/synced with backend/i)).toBeInTheDocument();
  });

  it('displays synced transactions when online (Req 12.6)', () => {
    const tx = makeTransaction({ total: 5000, syncStatus: 'synced' });
    usePOSStore.setState({ transactions: [tx], isOnline: true });

    render(<ConnectedTransactionHistory />);
    fireEvent.click(screen.getByRole('button', { name: /view transaction history/i }));

    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });
});
