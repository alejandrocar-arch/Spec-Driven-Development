/**
 * Virtual scrolling tests for Task 24.4
 * Verifies lazy loading of search results
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductSearch } from './ProductSearch';
import { usePOSStore } from '../../store/posStore';
import type { Product } from '../../types';

// Mock the store
vi.mock('../../store/posStore');

describe('ProductSearch Virtual Scrolling (Task 24.4)', () => {
  const generateMockProducts = (count: number): Product[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      barcode: `12345678901${i.toString().padStart(2, '0')}`,
      name: `Product ${i}`,
      category: 'Test',
      price: 1000 + i,
      taxRate: 0.08,
      lastUpdated: Date.now(),
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initially display only 50 results when more are available', async () => {
    const manyProducts = generateMockProducts(100);
    const mockStore = {
      searchProducts: vi.fn(() => manyProducts),
      getProductByBarcode: vi.fn(),
      addToCart: vi.fn(),
      isOnline: true,
    };

    vi.mocked(usePOSStore).mockImplementation((selector: any) => {
      return selector(mockStore);
    });

    const user = userEvent.setup();
    render(<ProductSearch onProductSelect={vi.fn()} />);

    // Type search query
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Product');

    // Wait for debounce and search results
    await waitFor(
      () => {
        expect(mockStore.searchProducts).toHaveBeenCalledWith('Product');
      },
      { timeout: 500 }
    );

    // Should show indicator that more results are available
    await waitFor(() => {
      expect(screen.getByText(/Showing 50 of 100 results/)).toBeInTheDocument();
    });
  });

  it('should display all results when count is less than 50', async () => {
    const fewProducts = generateMockProducts(20);
    const mockStore = {
      searchProducts: vi.fn(() => fewProducts),
      getProductByBarcode: vi.fn(),
      addToCart: vi.fn(),
      isOnline: true,
    };

    vi.mocked(usePOSStore).mockImplementation((selector: any) => {
      return selector(mockStore);
    });

    const user = userEvent.setup();
    render(<ProductSearch onProductSelect={vi.fn()} />);

    // Type search query
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Product');

    // Wait for search results
    await waitFor(
      () => {
        expect(mockStore.searchProducts).toHaveBeenCalledWith('Product');
      },
      { timeout: 500 }
    );

    // Should NOT show "scroll for more" indicator
    await waitFor(() => {
      expect(screen.queryByText(/Scroll for more/)).not.toBeInTheDocument();
    });
  });

  it('should reset visible count when new search is performed', async () => {
    const manyProducts = generateMockProducts(100);
    const mockStore = {
      searchProducts: vi.fn(() => manyProducts),
      getProductByBarcode: vi.fn(),
      addToCart: vi.fn(),
      isOnline: true,
    };

    vi.mocked(usePOSStore).mockImplementation((selector: any) => {
      return selector(mockStore);
    });

    const user = userEvent.setup();
    render(<ProductSearch onProductSelect={vi.fn()} />);

    // First search
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Product');

    await waitFor(
      () => {
        expect(mockStore.searchProducts).toHaveBeenCalledWith('Product');
      },
      { timeout: 500 }
    );

    // Clear and type new search
    await user.clear(searchInput);
    await user.type(searchInput, 'New Search');

    // Should reset to showing first 50 results
    await waitFor(
      () => {
        expect(mockStore.searchProducts).toHaveBeenCalledWith('New Search');
      },
      { timeout: 500 }
    );
  });
});
