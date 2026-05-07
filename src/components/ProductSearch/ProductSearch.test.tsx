/**
 * Tests for ProductSearch component and its sub-components.
 * Verifies store integration, offline mode handling, and barcode lookup.
 *
 * Requirements: 1.6, 2.6, 9.3, 9.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductSearch } from './ProductSearch';
import { usePOSStore } from '../../store/posStore';
import type { Product } from '../../types';

// ---------------------------------------------------------------------------
// Mock html5-qrcode – it cannot run in jsdom (no real camera)
// ---------------------------------------------------------------------------
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    barcode: '1234567890123',
    name: 'Apple',
    category: 'Fruit',
    price: 150,
    taxRate: 0,
    lastUpdated: Date.now(),
    ...overrides,
  };
}

function resetStore() {
  usePOSStore.setState({
    products: [],
    productIndex: new Map(),
    cart: [],
    cartDiscounts: [],
    isOnline: true,
    isSyncing: false,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// ProductSearch – store integration
// ---------------------------------------------------------------------------

describe('ProductSearch – store integration', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders search input, barcode input, and camera button', () => {
    render(<ProductSearch onProductSelect={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByLabelText(/enter product barcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/open camera barcode scanner/i)).toBeInTheDocument();
  });

  it('calls searchProducts from store after debounce and shows results', async () => {
    const product = makeProduct({ name: 'Apple', category: 'Fruit' });
    usePOSStore.setState({ products: [product], productIndex: new Map() });

    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    const input = screen.getByRole('searchbox');

    await user.type(input, 'App');

    // Results should not appear before debounce fires
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Advance debounce timer
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  it('shows "No products found" when search returns empty results', async () => {
    usePOSStore.setState({ products: [], productIndex: new Map() });

    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    const input = screen.getByRole('searchbox');

    await user.type(input, 'xyz');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it('does not search when fewer than 2 characters are entered', async () => {
    const product = makeProduct();
    usePOSStore.setState({ products: [product], productIndex: new Map() });

    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    const input = screen.getByRole('searchbox');

    await user.type(input, 'A');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('adds product to cart and calls onProductSelect when result is clicked', async () => {
    const product = makeProduct({ name: 'Banana', category: 'Fruit' });
    usePOSStore.setState({ products: [product], productIndex: new Map() });

    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={onSelect} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'Ban');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => screen.getByText('Banana'));
    fireEvent.click(screen.getByText('Banana'));

    expect(onSelect).toHaveBeenCalledWith(product);
    expect(usePOSStore.getState().cart).toHaveLength(1);
    expect(usePOSStore.getState().cart[0].product.id).toBe(product.id);
  });
});

// ---------------------------------------------------------------------------
// ProductSearch – barcode lookup (Req 2.6, 9.4)
// ---------------------------------------------------------------------------

describe('ProductSearch – barcode lookup', () => {
  beforeEach(() => {
    resetStore();
  });

  it('adds product to cart when a valid barcode is entered and Enter pressed', async () => {
    const product = makeProduct({ barcode: '1234567890123' });
    const index = new Map<string, Product>([['1234567890123', product]]);
    usePOSStore.setState({ products: [product], productIndex: index });

    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={onSelect} />);

    const barcodeInput = screen.getByLabelText(/enter product barcode/i);
    await user.type(barcodeInput, '1234567890123');
    fireEvent.keyDown(barcodeInput, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(product);
    expect(usePOSStore.getState().cart).toHaveLength(1);
  });

  it('shows error when barcode has wrong length', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);

    const barcodeInput = screen.getByLabelText(/enter product barcode/i);
    await user.type(barcodeInput, '123');
    fireEvent.keyDown(barcodeInput, { key: 'Enter' });

    // BarcodeInput shows the format error; ProductSearch shows the "not found" error
    // At least one alert should appear
    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('shows "Product not found" error when barcode is valid format but not in store', async () => {
    usePOSStore.setState({ products: [], productIndex: new Map() });

    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);

    const barcodeInput = screen.getByLabelText(/enter product barcode/i);
    await user.type(barcodeInput, '1234567890123');
    fireEvent.keyDown(barcodeInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/product not found/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// ProductSearch – offline mode (Req 1.6, 9.3)
// ---------------------------------------------------------------------------

describe('ProductSearch – offline mode', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows offline indicator when store.isOnline is false', () => {
    usePOSStore.setState({ isOnline: false });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
  });

  it('does not show offline indicator when online', () => {
    usePOSStore.setState({ isOnline: true });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
  });

  it('still searches local products when offline (Req 9.3)', async () => {
    const product = makeProduct({ name: 'Mango', category: 'Fruit' });
    usePOSStore.setState({
      products: [product],
      productIndex: new Map(),
      isOnline: false,
    });

    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={vi.fn()} />);
    const input = screen.getByRole('searchbox');

    await user.type(input, 'Man');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(screen.getByText('Mango')).toBeInTheDocument();
    });
  });

  it('still resolves barcodes from local index when offline (Req 9.4)', async () => {
    const product = makeProduct({ barcode: '9876543210123' });
    const index = new Map<string, Product>([['9876543210123', product]]);
    usePOSStore.setState({
      products: [product],
      productIndex: index,
      isOnline: false,
    });

    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<ProductSearch onProductSelect={onSelect} />);

    const barcodeInput = screen.getByLabelText(/enter product barcode/i);
    await user.type(barcodeInput, '9876543210123');
    fireEvent.keyDown(barcodeInput, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(product);
  });
});

// ---------------------------------------------------------------------------
// ProductSearch – camera scanner
// ---------------------------------------------------------------------------

describe('ProductSearch – camera scanner', () => {
  beforeEach(() => {
    resetStore();
  });

  it('opens camera scanner when camera button is clicked', () => {
    render(<ProductSearch onProductSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/open camera barcode scanner/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes camera scanner when close button is clicked', async () => {
    render(<ProductSearch onProductSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/open camera barcode scanner/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/close camera scanner/i));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
