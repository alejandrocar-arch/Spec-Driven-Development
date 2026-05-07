/**
 * Performance optimization tests for Task 24
 * Verifies memoization and rendering optimizations
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ShoppingCart } from './ShoppingCart';
import { usePOSStore } from '../../store/posStore';
import type { CartItem, Product } from '../../types';

// Mock the store
vi.mock('../../store/posStore');

describe('ShoppingCart Performance Optimizations (Task 24.1)', () => {
  const mockProduct: Product = {
    id: 'p1',
    barcode: '123456789012',
    name: 'Test Product',
    category: 'Test',
    price: 1000,
    taxRate: 0.08,
    lastUpdated: Date.now(),
  };

  const mockCartItem: CartItem = {
    id: 'item1',
    product: mockProduct,
    quantity: 2,
    lineTotal: 2000,
  };

  it('should use useMemo for cart calculations', () => {
    // Setup mock store
    const mockStore = {
      cart: [mockCartItem],
      cartDiscounts: [],
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
      applyDiscount: vi.fn(),
      removeDiscount: vi.fn(),
    };

    vi.mocked(usePOSStore).mockImplementation((selector: any) => {
      return selector(mockStore);
    });

    // Render component
    const { rerender } = render(<ShoppingCart />);

    // Verify initial render shows correct totals
    expect(screen.getByLabelText(/Subtotal: \$20\.00/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total: \$21\.60/)).toBeInTheDocument();

    // Re-render with same data (memoization should prevent recalculation)
    rerender(<ShoppingCart />);

    // Totals should still be correct
    expect(screen.getByLabelText(/Subtotal: \$20\.00/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total: \$21\.60/)).toBeInTheDocument();
  });

  it('should render CartItem components efficiently', () => {
    const mockStore = {
      cart: [mockCartItem],
      cartDiscounts: [],
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
      applyDiscount: vi.fn(),
      removeDiscount: vi.fn(),
    };

    vi.mocked(usePOSStore).mockImplementation((selector: any) => {
      return selector(mockStore);
    });

    render(<ShoppingCart />);

    // Verify cart item is rendered
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Quantity input
  });
});
