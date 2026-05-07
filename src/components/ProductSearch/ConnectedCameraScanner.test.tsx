/**
 * Tests for ConnectedCameraScanner component.
 * Verifies that the store-connected wrapper correctly looks up scanned barcodes,
 * adds products to the cart, and displays errors for unknown barcodes.
 *
 * Requirements: 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ConnectedCameraScanner } from './ConnectedCameraScanner';
import { usePOSStore } from '../../store/posStore';
import type { Product } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';

// ---------------------------------------------------------------------------
// Mock html5-qrcode – no real camera in jsdom
// ---------------------------------------------------------------------------

type ScanSuccessCallback = (decodedText: string) => void;

let capturedOnScan: ScanSuccessCallback | null = null;

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockImplementation(
      (_constraints, _config, onScanSuccess: ScanSuccessCallback) => {
        capturedOnScan = onScanSuccess;
        return Promise.resolve();
      }
    ),
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
// ConnectedCameraScanner tests
// ---------------------------------------------------------------------------

describe('ConnectedCameraScanner', () => {
  beforeEach(() => {
    resetStore();
    capturedOnScan = null;
    vi.clearAllMocks();
  });

  it('renders the camera scanner dialog', () => {
    render(<ConnectedCameraScanner onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<ConnectedCameraScanner onClose={onClose} />);
    screen.getByLabelText(/close camera scanner/i).click();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('adds product to cart when a known barcode is scanned (Req 3.3)', async () => {
    const product = makeProduct({ barcode: '1234567890123' });
    const index = new Map<string, Product>([['1234567890123', product]]);
    usePOSStore.setState({ products: [product], productIndex: index });

    render(<ConnectedCameraScanner onClose={vi.fn()} />);

    // Wait for scanner to start and capture the callback
    await waitFor(() => expect(Html5Qrcode).toHaveBeenCalled());
    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    // Simulate a successful scan
    await act(async () => {
      capturedOnScan!('1234567890123');
    });

    expect(usePOSStore.getState().cart).toHaveLength(1);
    expect(usePOSStore.getState().cart[0].product.id).toBe(product.id);
  });

  it('calls onProductAdded with product id after successful scan', async () => {
    const product = makeProduct({ barcode: '1234567890123' });
    const index = new Map<string, Product>([['1234567890123', product]]);
    usePOSStore.setState({ products: [product], productIndex: index });

    const onProductAdded = vi.fn();
    render(<ConnectedCameraScanner onClose={vi.fn()} onProductAdded={onProductAdded} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    await act(async () => {
      capturedOnScan!('1234567890123');
    });

    expect(onProductAdded).toHaveBeenCalledWith(product.id);
  });

  it('shows error message when scanned barcode is not found (Req 3.4)', async () => {
    usePOSStore.setState({ products: [], productIndex: new Map() });

    render(<ConnectedCameraScanner onClose={vi.fn()} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    await act(async () => {
      capturedOnScan!('9999999999999');
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert').textContent).toMatch(/product not found/i);
    });
  });

  it('does not add to cart when scanned barcode is not found', async () => {
    usePOSStore.setState({ products: [], productIndex: new Map() });

    render(<ConnectedCameraScanner onClose={vi.fn()} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    await act(async () => {
      capturedOnScan!('9999999999999');
    });

    expect(usePOSStore.getState().cart).toHaveLength(0);
  });

  it('does not call onProductAdded when barcode is not found', async () => {
    usePOSStore.setState({ products: [], productIndex: new Map() });

    const onProductAdded = vi.fn();
    render(<ConnectedCameraScanner onClose={vi.fn()} onProductAdded={onProductAdded} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    await act(async () => {
      capturedOnScan!('9999999999999');
    });

    expect(onProductAdded).not.toHaveBeenCalled();
  });

  it('works offline – looks up product from in-memory index (Req 3.3)', async () => {
    const product = makeProduct({ barcode: '1234567890123' });
    const index = new Map<string, Product>([['1234567890123', product]]);
    usePOSStore.setState({
      products: [product],
      productIndex: index,
      isOnline: false,
    });

    render(<ConnectedCameraScanner onClose={vi.fn()} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    await act(async () => {
      capturedOnScan!('1234567890123');
    });

    expect(usePOSStore.getState().cart).toHaveLength(1);
    expect(usePOSStore.getState().cart[0].product.id).toBe(product.id);
  });

  it('increments quantity when the same product is scanned after the 500ms cooldown', async () => {
    const product = makeProduct({ barcode: '1234567890123' });
    const index = new Map<string, Product>([['1234567890123', product]]);
    usePOSStore.setState({ products: [product], productIndex: index });

    render(<ConnectedCameraScanner onClose={vi.fn()} />);

    await waitFor(() => expect(capturedOnScan).not.toBeNull());

    // First scan
    await act(async () => {
      capturedOnScan!('1234567890123');
    });

    // Wait for the CameraScanner's 500ms cooldown to expire before scanning again
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // Second scan after cooldown
    await act(async () => {
      capturedOnScan!('1234567890123');
    });

    const cart = usePOSStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });
});
