/**
 * ConnectedCameraScanner component
 * A store-connected wrapper around CameraScanner that handles barcode lookup
 * and cart addition directly via the Zustand store.
 *
 * Use this component when you need a standalone camera scanner that
 * automatically looks up scanned barcodes and adds products to the cart,
 * without requiring a parent component to wire the store actions.
 *
 * Requirements: 3.3
 */

import React, { useCallback, useState, useEffect } from 'react';
import { usePOSStore } from '../../store/posStore';
import { CameraScanner } from './CameraScanner';

interface ConnectedCameraScannerProps {
  /** Called when the scanner is closed */
  onClose: () => void;
  /**
   * Optional callback invoked after a product is successfully found and added
   * to the cart. Useful for parent components that want to react to additions.
   */
  onProductAdded?: (productId: string) => void;
}

const ERROR_DISMISS_MS = 5000;

export const ConnectedCameraScanner: React.FC<ConnectedCameraScannerProps> = ({
  onClose,
  onProductAdded,
}) => {
  const getProductByBarcode = usePOSStore((s) => s.getProductByBarcode);
  const addToCart = usePOSStore((s) => s.addToCart);

  const [scanError, setScanError] = useState<string | null>(null);

  // Auto-dismiss scan error after 5 seconds (Req 11.5)
  useEffect(() => {
    if (!scanError) return;
    const timer = setTimeout(() => setScanError(null), ERROR_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [scanError]);

  /**
   * Handle a scanned barcode:
   * 1. Look up the product in the store (works offline – queries in-memory index)
   * 2. If found, add to cart and notify parent
   * 3. If not found, display an error and continue scanning (Req 3.4)
   */
  const handleScan = useCallback(
    (barcode: string) => {
      setScanError(null);
      const product = getProductByBarcode(barcode);
      if (!product) {
        setScanError(
          `❌ Product not found for barcode ${barcode}. Please check the barcode and try again.`
        );
        return;
      }
      addToCart(product);
      onProductAdded?.(product.id);
    },
    [getProductByBarcode, addToCart, onProductAdded]
  );

  return (
    <>
      <CameraScanner onScan={handleScan} onClose={onClose} />

      {/* Scan error overlay – rendered outside CameraScanner so it doesn't
          interfere with the scanner's own error display */}
      {scanError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-full px-4 py-3 bg-red-600 text-white rounded-xl shadow-lg text-sm text-center"
          style={{ fontSize: '14px' }}
        >
          {scanError}
        </div>
      )}
    </>
  );
};
