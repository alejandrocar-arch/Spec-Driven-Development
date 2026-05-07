/**
 * ProductSearch component
 * Orchestrates product search by name/category and barcode lookup.
 * Wired to the Zustand store via searchProducts and getProductByBarcode actions.
 * Handles offline mode transparently – both actions work against the in-memory
 * product index which is populated from IndexedDB on app start.
 *
 * Performance optimizations (Task 24.4):
 * - Virtual scrolling: Only renders visible items (50 at a time)
 * - Lazy loading: Loads more items on scroll
 *
 * Requirements: 1.6, 2.6, 9.3, 9.4
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePOSStore } from '../../store/posStore';
import type { Product } from '../../types';
import { SearchInput } from './SearchInput';
import { BarcodeInput } from './BarcodeInput';
import { CameraScanner } from './CameraScanner';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const ITEMS_PER_PAGE = 50; // Virtual scrolling: limit visible results (Task 24.4)

interface ProductSearchProps {
  /** Called when the user selects a product from results or via barcode */
  onProductSelect: (product: Product) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onProductSelect }) => {
  // Store state and actions
  const searchProducts = usePOSStore((s) => s.searchProducts);
  const getProductByBarcode = usePOSStore((s) => s.getProductByBarcode);
  const addToCart = usePOSStore((s) => s.addToCart);
  const isOnline = usePOSStore((s) => s.isOnline);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE); // Virtual scrolling state (Task 24.4)
  const [isSearching, setIsSearching] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  // Auto-dismiss barcode error after 5 seconds
  useEffect(() => {
    if (!barcodeError) return;
    const timer = setTimeout(() => setBarcodeError(null), 5000);
    return () => clearTimeout(timer);
  }, [barcodeError]);

  // Debounced search – works offline because searchProducts queries the in-memory index
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setFocusedIndex(-1);
      setVisibleCount(ITEMS_PER_PAGE); // Reset visible count on new search (Task 24.4)

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < MIN_SEARCH_LENGTH) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        // searchProducts works against the in-memory product list (populated from
        // IndexedDB on app start), so it functions correctly in offline mode (Req 9.3)
        const results = searchProducts(value);
        setSearchResults(results);
        setIsSearching(false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [searchProducts]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * Barcode lookup – works offline because getProductByBarcode queries the
   * in-memory productIndex (populated from IndexedDB on app start) (Req 9.4, 2.6)
   */
  const handleBarcodeLookup = useCallback(
    (barcode: string) => {
      setBarcodeError(null);
      const product = getProductByBarcode(barcode);
      if (!product) {
        setBarcodeError(`Product not found for barcode ${barcode}.`);
        return;
      }
      addToCart(product);
      onProductSelect(product);
    },
    [getProductByBarcode, addToCart, onProductSelect]
  );

  /** Camera scan handler – same barcode lookup path */
  const handleCameraScan = useCallback(
    (barcode: string) => {
      handleBarcodeLookup(barcode);
    },
    [handleBarcodeLookup]
  );

  /** Select a product from the results list */
  const handleProductSelect = useCallback(
    (product: Product) => {
      addToCart(product);
      onProductSelect(product);
      // Clear search after selection
      setSearchTerm('');
      setSearchResults([]);
      setFocusedIndex(-1);
      setVisibleCount(ITEMS_PER_PAGE); // Reset visible count (Task 24.4)
    },
    [addToCart, onProductSelect]
  );

  /** Handle scroll for lazy loading more results (Task 24.4) */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLUListElement>) => {
      const element = e.currentTarget;
      const scrolledToBottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100; // 100px threshold

      if (scrolledToBottom && visibleCount < searchResults.length) {
        setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, searchResults.length));
      }
    },
    [visibleCount, searchResults.length]
  );

  /** Keyboard navigation for results list */
  const handleResultsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (searchResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        handleProductSelect(searchResults[focusedIndex]);
      }
    },
    [searchResults, focusedIndex, handleProductSelect]
  );

  // Ctrl+S to open camera scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        setShowCamera(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasResults = searchResults.length > 0;
  const noResults = searchTerm.length >= MIN_SEARCH_LENGTH && !isSearching && !hasResults;

  return (
    <section aria-label="Product search" className="flex flex-col gap-3">
      {/* Offline indicator */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-700"
          style={{ fontSize: '14px' }}
        >
          🔌 <strong>Offline Mode</strong> – searching local product database
        </div>
      )}

      {/* Search input row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            isSearching={isSearching}
          />
        </div>

        {/* Camera scan button */}
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          aria-label="Open camera barcode scanner (Ctrl+S)"
          title="Scan barcode with camera (Ctrl+S)"
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          style={{ fontSize: '14px' }}
        >
          📷
        </button>
      </div>

      {/* Barcode input */}
      <BarcodeInput
        onBarcodeLookup={handleBarcodeLookup}
        isOnline={isOnline}
      />

      {/* Barcode error */}
      {barcodeError && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-sm text-red-600 flex items-center gap-1"
          style={{ fontSize: '14px' }}
        >
          ❌ {barcodeError}
        </p>
      )}

      {/* Search results with virtual scrolling (Task 24.4) */}
      {hasResults && (
        <>
          <ul
            ref={resultsRef}
            role="listbox"
            aria-label="Search results"
            onKeyDown={handleResultsKeyDown}
            onScroll={handleScroll}
            className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto shadow-sm"
            tabIndex={0}
          >
            {searchResults.slice(0, visibleCount).map((product, index) => (
              <li
                key={product.id}
                role="option"
                aria-selected={index === focusedIndex}
                onClick={() => handleProductSelect(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProductSelect(product);
                  }
                }}
                tabIndex={0}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                  index === focusedIndex ? 'bg-blue-50' : ''
                }`}
                style={{ fontSize: '14px' }}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="text-xs text-gray-500">{product.category}</span>
                </div>
                <span className="font-semibold text-gray-800 ml-4">
                  ${(product.price / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          {/* Show loading indicator when more results are available (Task 24.4) */}
          {visibleCount < searchResults.length && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-gray-500 text-center py-2"
              style={{ fontSize: '14px' }}
            >
              Showing {visibleCount} of {searchResults.length} results. Scroll for more…
            </p>
          )}
        </>
      )}

      {/* No results message */}
      {noResults && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-gray-500 text-center py-4"
          style={{ fontSize: '14px' }}
        >
          No products found for "{searchTerm}"
        </p>
      )}

      {/* Camera scanner modal */}
      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </section>
  );
};
